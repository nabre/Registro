"""Il check del corso, provato su Chromium: la pagina, il tasto destro, l'ora.

Tre cose che `node --test` non vede, perché vivono nei clic:

- il clic su una casella vuota manda `check.spunta` con il quando giusto — la
  lezione di oggi se il corso ce l'ha, altrimenti la data di oggi; su una
  spuntata oggi la toglie, su una spuntata in un altro giorno non manda niente
  (quella si cambia solo dal tasto destro);
- il tasto destro apre il menu della casella, e «Scegli la data…» porta a una
  finestra che manda `check.data` con il giorno scritto;
- dentro un'ora la stessa griglia spunta in quell'ora, e un corso senza
  colonne mostra una riga sola invece di una scheda vuota;
- la scheda del corso riassume il check colonna per colonna, lo conta persona
  per persona e porta la griglia, che si spunta come la pagina; la scheda della
  persona ha un riquadro «Check» con le stesse caselle.

Il ponte di prova risponde «fatto» a ogni azione e non riscrive il registro:
quel che si guarda qui è che cosa parte, non che cosa torna.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/check.py`
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

# Il check del primo corso: due colonne, la seconda spuntata a mano il 10
# settembre. Serve solo a queste prove.
PREPARA = '''() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const check = { id: 'chk-prova', corsoId: corso.id,
    colonne: [{ id: 'c1', titolo: 'Regolamento' }, { id: 'c2', titolo: 'Quaderno' }],
    spunte: [{ allievoId: r.classi[0].allievi[0].id, colonnaId: 'c2', lezioneId: null,
      data: '2026-09-10', fattaIl: '2026-09-10T08:00:00.000Z' }],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-10T08:00:00.000Z' }
  prova.aggiorna({ registro: { ...r, check: [check] }, vista: 'check', corsoId: corso.id })
}'''

# La data di oggi come la calcola il registro: quella locale, non quella UTC.
OGGI = ("(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');"
        "return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()")

# Un'ora del primo corso oggi: la pagina deve spuntare dentro quella.
ORA_DI_OGGI = '''(oggi) => {
  const r = prova.stato.registro
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const lezione = { ...base, id: 'lez-oggi', data: oggi, stato: 'pianificata' }
  prova.aggiorna({ registro: { ...r, lezioni: [...r.lezioni, lezione] } })
}'''

ULTIMA = "(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).map(m=>m.azione).at(-1) ?? null"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')

    page.evaluate(PREPARA)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    oggi = page.evaluate(OGGI)
    allievo = page.evaluate('prova.stato.registro.classi[0].allievi[0].id')
    lezione_vecchia = page.evaluate(
        "prova.stato.registro.lezioni.find(l=>l.corsoId===prova.stato.registro.corsi[0].id).id")

    # La pagina: due colonne, con il conto sotto il nome; la casella spuntata
    # dice il giorno, corto.
    griglia = page.locator('.vista--check table.check')
    expect(griglia).to_have_count(1)
    expect(griglia.locator('.check__testata')).to_have_count(2)
    expect(griglia.locator('.check__testata').nth(1)).to_contain_text('1/1')
    c1 = page.locator(f'[data-fuoco="check-{allievo}-c1"]')
    c2 = page.locator(f'[data-fuoco="check-{allievo}-c2"]')
    expect(c1).to_have_attribute('aria-pressed', 'false')
    expect(c2).to_have_attribute('aria-pressed', 'true')
    expect(c2).to_have_text('10.09')
    assert 'data scelta a mano' in c2.get_attribute('title'), c2.get_attribute('title')

    # Senza un'ora oggi, il clic spunta con la data di oggi.
    page.evaluate('richieste.length = 0')
    c1.click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    assert spunta['fatta'] is True and spunta['colonnaId'] == 'c1' and spunta['allievoId'] == allievo, spunta
    assert spunta.get('data') == oggi and not spunta.get('lezioneId'), spunta
    page.wait_for_timeout(50)

    # Con un'ora oggi, il clic spunta dentro quell'ora.
    page.evaluate(ORA_DI_OGGI, oggi)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    page.evaluate('richieste.length = 0')
    c1.click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    assert spunta.get('lezioneId') == 'lez-oggi', spunta
    page.wait_for_timeout(50)

    # Il tasto destro sulla casella vuota: la data si sceglie a mano.
    c1.click(button='right')
    menu = page.locator('.menu')
    expect(menu.get_by_role('menuitem', name='Scegli la data…')).to_have_count(1)
    expect(menu.get_by_role('menuitem', name='Togli la spunta')).to_have_count(0)
    menu.get_by_role('menuitem', name='Scegli la data…').click()
    finestra = page.locator('form.modale')
    expect(finestra).to_have_count(1)
    campo = finestra.locator('input.campo__controllo--data')
    campo.fill('12.9.26')
    campo.press('Tab')
    page.evaluate('richieste.length = 0')
    finestra.get_by_role('button', name='Spunta', exact=True).click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.data')")
    data = page.evaluate(ULTIMA, 'check.data')
    assert data == {'tipo': 'check.data', 'corsoId': page.evaluate('prova.stato.corsoId'),
                    'allievoId': allievo, 'colonnaId': 'c1', 'data': '2026-09-12'}, data
    expect(finestra).to_have_count(0)

    # Sulla casella spuntata un altro giorno il clic sinistro non fa niente: si
    # cambia dal tasto destro, così un clic sbagliato non la toglie.
    page.evaluate('richieste.length = 0')
    c2.click()
    page.wait_for_timeout(50)
    mandate = page.evaluate("richieste.filter(m=>m.azione?.tipo?.startsWith('check.')).length")
    assert mandate == 0, 'il clic sinistro su una casella spuntata ha mandato qualcosa'
    assert 'tasto destro per cambiarla' in c2.get_attribute('aria-label'), c2.get_attribute('aria-label')

    # Il doppio clic su una vuota è un clic e la sua correzione: il secondo parte
    # da quel che ha mandato il primo.
    page.evaluate('richieste.length = 0')
    page.evaluate(f"() => {{ const c = document.querySelector('[data-fuoco=\"check-{allievo}-c1\"]'); c.click(); c.click() }}")
    page.wait_for_timeout(50)
    fatte = page.evaluate("richieste.filter(m=>m.azione?.tipo==='check.spunta').map(m=>m.azione.fatta)")
    assert fatte == [True, False], f'il doppio clic ha mandato {fatte}'

    # Una casella spuntata oggi, invece, il clic la toglie: è la correzione.
    page.evaluate('''([oggi, allievo]) => {
      const r = prova.stato.registro
      const check = { ...r.check[0], spunte: [...r.check[0].spunte, { allievoId: allievo,
        colonnaId: 'c1', lezioneId: null, data: oggi, fattaIl: '2026-09-24T08:00:00.000Z' }] }
      prova.aggiorna({ registro: { ...r, check: [check] } })
    }''', [oggi, allievo])
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert 'clic per togliere' in c1.get_attribute('aria-label'), c1.get_attribute('aria-label')
    page.evaluate('richieste.length = 0')
    c1.click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    assert spunta['fatta'] is False and spunta['colonnaId'] == 'c1', spunta
    page.wait_for_timeout(50)
    # E si torna com'era, per le prove che seguono: c1 vuota.
    page.evaluate(PREPARA)
    page.evaluate('()=>new Promise(requestAnimationFrame)')

    # Sulla casella spuntata il menu cambia: cambiare la data, togliere.
    c2.click(button='right')
    expect(menu.get_by_role('menuitem', name='Cambia la data…')).to_have_count(1)
    togli = menu.get_by_role('menuitem', name='Togli la spunta')
    expect(togli).to_have_count(1)
    page.evaluate('richieste.length = 0')
    togli.click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    assert spunta['fatta'] is False and spunta['colonnaId'] == 'c2', spunta
    page.wait_for_timeout(50)

    # Togliere una colonna con una spunta dentro lo dice prima, poi manda le
    # colonne che restano.
    page.locator('.check__testata').nth(1).click()
    menu.get_by_role('menuitem', name='Togli la colonna…').click()
    domanda = page.locator('form.modale')
    expect(domanda).to_contain_text('una casella già spuntata')
    page.evaluate('richieste.length = 0')
    domanda.get_by_role('button', name='Togli la colonna').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.colonne')")
    colonne = page.evaluate(ULTIMA, 'check.colonne')
    assert colonne['colonne'] == [{'id': 'c1', 'titolo': 'Regolamento'}], colonne

    # I comandi della pagina stanno nella barra.
    for id in ['check.nuovaColonna', 'check.colonne']:
        expect(page.locator(f'[data-fuoco="comando-{id}"]')).to_have_count(1)

    # Dentro un'ora: la stessa griglia nella scheda Amministrazione, e il clic
    # spunta in quell'ora.
    page.evaluate("id => prova.aggiorna({ vista: 'lezione', lezioneId: id, schedaLezione: 'amministrazione' })",
                  lezione_vecchia)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.vista--lezione .scheda--check')).to_have_count(1)
    expect(c2).to_have_class('casella-check casella-check--fatta casella-check--altrove casella-check--ferma')
    page.evaluate('richieste.length = 0')
    c1.click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    assert spunta.get('lezioneId') == lezione_vecchia and spunta['fatta'] is True, spunta
    c1.click(button='right')
    expect(menu.get_by_role('menuitem', name='Spunta in questa lezione')).to_have_count(1)
    page.keyboard.press('Escape')

    # La casella spuntata un altro giorno: il tasto destro la riporta a quest'ora.
    page.evaluate('richieste.length = 0')
    c2.click(button='right')
    menu.locator('.menu__voce', has_text='Assegna alla lezione corrente').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.lezione')")
    riportata = page.evaluate(ULTIMA, 'check.lezione')
    assert riportata.get('lezioneId') == lezione_vecchia and riportata.get('colonnaId') == 'c2',         riportata

    # Un corso senza colonne: una riga che porta alla pagina, niente griglia.
    altra = page.evaluate(
        "prova.stato.registro.lezioni.find(l=>l.corsoId===prova.stato.registro.corsi[1].id).id")
    page.evaluate("id => prova.aggiorna({ lezioneId: id })", altra)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.vista--lezione .scheda--check')).to_have_count(0)
    expect(page.locator('.vista--lezione .check-assente')).to_have_count(1)
    page.locator('.check-assente .collegamento').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.vista') == 'check'
    assert page.evaluate('prova.stato.corsoId') == page.evaluate('prova.stato.registro.corsi[1].id')
    expect(page.get_by_role('button', name='Aggiungi la prima colonna')).to_have_count(1)

    # Il menu della colonna ha «Aggiungi una colonna…»: la nuova nasce accanto.
    page.evaluate(PREPARA)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    page.locator('.check__testata').first.click()
    menu.get_by_role('menuitem', name='Aggiungi una colonna…').click()
    finestra = page.locator('form.modale')
    finestra.locator('input[name="titolo"]').fill('Relazione')
    page.evaluate('richieste.length = 0')
    finestra.get_by_role('button', name='Aggiungi', exact=True).click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.colonne')")
    colonne = page.evaluate(ULTIMA, 'check.colonne')
    assert [c['titolo'] for c in colonne['colonne']] == ['Regolamento', 'Relazione', 'Quaderno'], colonne
    expect(finestra).to_have_count(0)

    # La scheda del corso: riepilogo per colonna, colonna «Check» nella matrice, e
    # la griglia intera che si spunta come la pagina.
    attivi = page.evaluate('prova.stato.registro.classi[0].allievi.filter(a=>a.attivo).length')
    page.evaluate("prova.aggiorna({ vista: 'corsi' })")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    numeri = page.locator('.corso-scheda .sintesi')
    quaderno = numeri.locator('.dato', has_text='Quaderno')
    expect(quaderno.locator('.dato__valore')).to_have_text(f'1/{attivi}')
    expect(numeri.locator('.dato', has_text='Regolamento').locator('.dato__valore')).to_have_text(f'0/{attivi}')
    matrice = page.locator('.corso-dettaglio table').first
    expect(matrice.locator('thead th', has_text='Check')).to_have_count(1)
    cella = matrice.locator('tbody tr', has_text=page.evaluate(
        "(()=>{const a=prova.stato.registro.classi[0].allievi[0]; return a.cognome})()")).locator('td').last
    expect(cella).to_have_text('1/2')
    assert 'Regolamento' in cella.locator('span').first.get_attribute('title')
    griglia_corso = page.locator('.vista--corsi .scheda--check table.check')
    expect(griglia_corso).to_have_count(1)
    page.evaluate('richieste.length = 0')
    griglia_corso.locator(f'[data-fuoco="check-{allievo}-c1"]').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    # C'è l'ora di oggi: la spunta dalla scheda del corso la segue, come dalla pagina.
    assert spunta['fatta'] is True and spunta['colonnaId'] == 'c1' and spunta.get('lezioneId') == 'lez-oggi', spunta
    page.wait_for_timeout(50)
    # Il pulsante in cima porta alla pagina del check di questo corso.
    page.locator('.corso-scheda').get_by_title('Il check di questo corso').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.vista') == 'check'

    # Con tutti gli attivi spuntati la colonna è piena, e la pastiglia lo dice.
    page.evaluate('''() => {
      const r = prova.stato.registro
      const attivi = r.classi[0].allievi.filter((a) => a.attivo)
      const spunte = attivi.map((a) => ({ allievoId: a.id, colonnaId: 'c2', lezioneId: null,
        data: '2026-09-10', fattaIl: '2026-09-10T08:00:00.000Z' }))
      prova.aggiorna({ registro: { ...r, check: [{ ...r.check[0], spunte }] }, vista: 'corsi' })
    }''')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    quaderno = page.locator('.corso-scheda .sintesi .dato', has_text='Quaderno')
    expect(quaderno.locator('.dato__valore')).to_have_text(f'{attivi}/{attivi}')
    expect(quaderno).to_have_class('dato dato--positivo')
    expect(page.locator('.corso-scheda .sintesi .dato', has_text='Regolamento')).to_have_class('dato')

    # La scheda della persona, linguetta Materie: un riquadro «Check» con una
    # casella per colonna.
    page.evaluate(PREPARA)
    page.evaluate('''(id) => prova.aggiorna({ vista: 'allievo', classeId: prova.stato.registro.classi[0].id,
      allievoId: id, schedaPersona: 'materie' })''', allievo)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    tema = page.locator('.riquadro-tema', has=page.locator('.gruppo-titolo__nome', has_text='Check'))
    expect(tema).to_have_count(1)
    voci = tema.locator('.check-allievo__voce')
    expect(voci).to_have_count(2)
    expect(voci.nth(0)).to_contain_text('da fare')
    expect(voci.nth(1)).to_contain_text('a mano')
    page.evaluate('richieste.length = 0')
    tema.locator(f'[data-fuoco="check-{allievo}-c1"]').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    assert spunta['fatta'] is True and spunta['colonnaId'] == 'c1' and spunta['allievoId'] == allievo, spunta
    page.wait_for_timeout(50)
    # La spuntata a mano un altro giorno: il clic non manda niente, il tasto
    # destro offre di toglierla.
    page.evaluate('richieste.length = 0')
    tema.locator(f'[data-fuoco="check-{allievo}-c2"]').click()
    page.wait_for_timeout(50)
    assert page.evaluate("richieste.filter(m=>m.azione?.tipo?.startsWith('check.')).length") == 0
    tema.locator(f'[data-fuoco="check-{allievo}-c2"]').click(button='right')
    expect(menu.get_by_role('menuitem', name='Togli la spunta')).to_have_count(1)
    page.keyboard.press('Escape')
    # Un corso senza colonne non ha il riquadro: il riquadro compare una volta.
    expect(page.locator('.riquadro-tema .gruppo-titolo__nome', has_text='Check')).to_have_count(1)

    assert not errors, f'errori JS: {errors}'
    browser.close()

print('check: ok')

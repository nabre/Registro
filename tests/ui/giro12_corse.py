"""Le corse fra quel che la pagina ha in mano e quel che il registro è diventato.

Giro 12. Ogni prova qui apre una finestra, o manda un clic, e *nel frattempo*
cambia il registro come farebbe un'altra finestra o l'assistente; poi guarda
che cosa parte:

- togliere una colonna del check rilegge le colonne dopo la domanda, e se nel
  frattempo le spunte che cadono sono cresciute lo richiede;
- l'elenco delle colonne, al Salva, tiene quelle nate altrove, non fa tornare
  quelle tolte altrove, non riscrive il nome di una rinominata altrove;
- tre clic su una casella nello stesso giro: il ritorno del primo non cancella
  la memoria del terzo, ancora in viaggio;
- «Spunta oggi» dentro un'ora di un altro giorno lega alla lezione di oggi;
- le liste delle impostazioni tengono il fuoco dopo il salvataggio;
- i giorni visibili leggono le impostazioni al clic, non al disegno;
- «Pulisci» le settimane manda l'anno com'è dopo la domanda.

Il ponte di prova qui sa trattenere le risposte, e per `impostazioni.salva`
rispinge il registro prima di rispondere, come fa il pannello vero.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/giro12_corse.py`
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

PONTE = '''
window.richieste = []
window.trattieni = false
window.trattenute = []
const rispondi = (m) => window.dispatchEvent(new MessageEvent('message',
  { data: { tipo: 'risposta', id: m.id, ok: true } }))
window.rilascia = () => { const m = trattenute.shift(); if (m) rispondi(m) }
window.acquireVsCodeApi = () => ({
  getState: () => null, setState: () => {},
  postMessage: (m) => {
    richieste.push(m)
    if (!m.id) return
    if (trattieni) { trattenute.push(m); return }
    setTimeout(() => {
      // Come il pannello: il registro nuovo arriva prima della risposta.
      if (m.azione?.tipo === 'impostazioni.salva') {
        const r = prova.stato.registro
        prova.aggiorna({ registro: { ...r, impostazioni: m.azione.impostazioni } })
      }
      rispondi(m)
    }, 0)
  },
})
'''

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

# Cambia il check come farebbe un'altra finestra: colonne e spunte nuove.
ALTROVE = '''([colonne, spunte]) => {
  const r = prova.stato.registro
  const allievo = r.classi[0].allievi[0].id
  const check = { ...r.check[0], colonne,
    spunte: spunte.map((colonnaId) => ({ allievoId: allievo, colonnaId, lezioneId: null,
      data: '2026-09-10', fattaIl: '2026-09-10T08:00:00.000Z' })) }
  prova.aggiorna({ registro: { ...r, check: [check] } })
}'''

OGGI = ("(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');"
        "return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()")

ULTIMA = "(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).map(m=>m.azione).at(-1) ?? null"
QUANTE = "(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).length"
FOTOGRAMMA = '()=>new Promise(requestAnimationFrame)'

C1 = {'id': 'c1', 'titolo': 'Regolamento'}
C2 = {'id': 'c2', 'titolo': 'Quaderno'}
C3 = {'id': 'c3', 'titolo': 'Relazione'}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')

    page.evaluate(PREPARA)
    page.evaluate(FOTOGRAMMA)
    allievo = page.evaluate('prova.stato.registro.classi[0].allievi[0].id')
    menu = page.locator('.menu')
    modali = page.locator('form.modale')

    # 1. Togliere «Quaderno»: mentre la domanda è aperta nasce «Relazione» con una
    # spunta. La lista mandata la tiene.
    page.locator('.check__testata').nth(1).click()
    menu.get_by_role('menuitem', name='Togli la colonna…').click()
    expect(modali).to_contain_text('una casella già spuntata')
    page.evaluate(ALTROVE, [[C1, C2, C3], ['c2', 'c3']])
    page.evaluate('richieste.length = 0')
    modali.get_by_role('button', name='Togli la colonna').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.colonne')")
    colonne = page.evaluate(ULTIMA, 'check.colonne')
    assert colonne['colonne'] == [C1, C3], colonne
    expect(modali).to_have_count(0)

    # 1b. Togliere «Regolamento», vuota: «non si perde niente». Intanto la si
    # spunta altrove: la risposta data non vale più, si richiede.
    page.evaluate(PREPARA)
    page.evaluate(FOTOGRAMMA)
    page.locator('.check__testata').nth(0).click()
    menu.get_by_role('menuitem', name='Togli la colonna…').click()
    expect(modali).to_contain_text('non si perde niente')
    page.evaluate(ALTROVE, [[C1, C2], ['c1', 'c2']])
    page.evaluate('richieste.length = 0')
    modali.get_by_role('button', name='Togli la colonna').click()
    expect(modali).to_contain_text('una casella già spuntata')
    assert page.evaluate(QUANTE, 'check.colonne') == 0, 'ha tolto senza richiedere'
    modali.get_by_role('button', name='Togli la colonna').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.colonne')")
    assert page.evaluate(ULTIMA, 'check.colonne')['colonne'] == [C2]
    expect(modali).to_have_count(0)

    # 2. L'elenco delle colonne è aperto e altrove «Regolamento» diventa «Regole»,
    # «Quaderno» se ne va e nasce «Relazione»: il Salva lo dice e manda la fusione.
    page.evaluate(PREPARA)
    page.evaluate(FOTOGRAMMA)
    page.locator('[data-fuoco="comando-check.colonne"]').click()
    expect(modali).to_have_count(1)
    page.evaluate(ALTROVE, [[{'id': 'c1', 'titolo': 'Regole'}, C3], []])
    page.evaluate('richieste.length = 0')
    modali.get_by_role('button', name='Salva', exact=True).click()
    domanda = modali.last
    expect(domanda).to_contain_text('Le colonne sono cambiate altrove')
    expect(domanda).to_contain_text('«Relazione»')
    expect(domanda).to_contain_text('«Quaderno»')
    domanda.get_by_role('button', name='Salva lo stesso').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.colonne')")
    colonne = page.evaluate(ULTIMA, 'check.colonne')['colonne']
    assert colonne == [{'id': 'c1', 'titolo': 'Regole'}, C3], colonne
    expect(modali).to_have_count(0)

    # 3. Tre clic nello stesso giro (spunta, togli, spunta) e torna solo il primo:
    # il quarto parte dal terzo, ancora in viaggio, e toglie.
    page.evaluate(PREPARA)
    page.evaluate(FOTOGRAMMA)
    page.evaluate('richieste.length = 0; trattieni = true')
    clic = f"document.querySelector('[data-fuoco=\"check-{allievo}-c1\"]').click()"
    page.evaluate(f'() => {{ {clic}; {clic}; {clic} }}')
    page.evaluate('async () => { rilascia(); await new Promise(r => setTimeout(r, 0)) }')
    page.evaluate(f'() => {{ {clic} }}')
    fatte = page.evaluate("richieste.filter(m=>m.azione?.tipo==='check.spunta').map(m=>m.azione.fatta)")
    assert fatte == [True, False, True, False], f'quattro clic hanno mandato {fatte}'
    page.evaluate('async () => { trattieni = false; while (trattenute.length) rilascia();'
                  ' await new Promise(r => setTimeout(r, 0)) }')

    # 4. «Spunta oggi» dentro l'ora di un altro giorno, con un'ora oggi: lega
    # la spunta a quell'ora, come dalla pagina.
    oggi = page.evaluate(OGGI)
    page.evaluate('''(oggi) => {
      const r = prova.stato.registro
      const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
      const lezione = { ...base, id: 'lez-oggi', data: oggi, stato: 'pianificata' }
      prova.aggiorna({ registro: { ...r, lezioni: [...r.lezioni, lezione] } })
    }''', oggi)
    vecchia = page.evaluate(
        "prova.stato.registro.lezioni.find(l=>l.corsoId===prova.stato.registro.corsi[0].id).id")
    assert vecchia != 'lez-oggi'
    page.evaluate("id => prova.aggiorna({ vista: 'lezione', lezioneId: id, "
                  "schedaLezione: 'amministrazione' })", vecchia)
    page.evaluate(FOTOGRAMMA)
    page.locator(f'[data-fuoco="check-{allievo}-c1"]').click(button='right')
    page.evaluate('richieste.length = 0')
    menu.get_by_role('menuitem', name='Spunta oggi').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='check.spunta')")
    spunta = page.evaluate(ULTIMA, 'check.spunta')
    assert spunta.get('lezioneId') == 'lez-oggi' and not spunta.get('data'), spunta

    # 5. Le liste: una voce nuova, Invio, la pagina si rifà, e il fuoco resta nel
    # campo per scrivere la seconda di fila.
    page.evaluate("prova.aggiorna({ vista: 'impostazioni', ambitoImpostazioni: 'documento', "
                  "schedaDocumento: 'liste' })")
    page.evaluate(FOTOGRAMMA)
    # Una lista alla volta, dietro la sua linguetta: la prima è chiusa e non ha
    # il campo per aggiungere, i supporti sì.
    page.locator('.liste-schede .selettore__voce', has_text='Supporti della spiegazione').click()
    page.evaluate(FOTOGRAMMA)
    nuova = page.locator('input.voce-lista__nuova').first
    chiave = nuova.get_attribute('data-fuoco')
    assert chiave and chiave.startswith('lista-nuova-'), chiave
    page.evaluate('richieste.length = 0')
    nuova.click()
    page.keyboard.type('Alfa prova')
    page.keyboard.press('Enter')
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='impostazioni.salva')")
    page.wait_for_timeout(50)
    page.evaluate(FOTOGRAMMA)
    attivo = page.evaluate('document.activeElement?.dataset?.fuoco ?? null')
    assert attivo == chiave, f'dopo il salvataggio il fuoco è su {attivo}'
    page.keyboard.type('Beta prova')
    page.keyboard.press('Enter')
    page.wait_for_function(f"({QUANTE})('impostazioni.salva') === 2")
    liste = page.evaluate(ULTIMA, 'impostazioni.salva')['impostazioni']['liste']
    testi = [v['testo'] for voci in liste.values() for v in voci]
    assert 'Alfa prova' in testi and 'Beta prova' in testi, testi
    page.wait_for_timeout(50)

    # 6. I giorni visibili: il registro nuovo arriva fra due clic, prima del
    # ridisegno, e il secondo clic parte da lì.
    page.evaluate("prova.aggiorna({ schedaDocumento: 'calendario' })")
    page.evaluate(FOTOGRAMMA)
    prima = page.evaluate('[...prova.stato.registro.impostazioni.giorniVisibili]')
    page.evaluate('richieste.length = 0; trattieni = true')
    page.evaluate('''() => {
      const voci = document.querySelectorAll('.scelta-giorni__voce')
      voci[5].click()
      const mandate = richieste.at(-1).azione.impostazioni
      const r = prova.stato.registro
      prova.aggiorna({ registro: { ...r, impostazioni: mandate } })
      voci[6].click()
    }''')
    seconda = page.evaluate(ULTIMA, 'impostazioni.salva')['impostazioni']['giorniVisibili']
    atteso = sorted(set(prima) ^ {6, 7})
    assert seconda == atteso, f'il secondo clic ha mandato {seconda}, atteso {atteso}'
    page.evaluate('async () => { trattieni = false; while (trattenute.length) rilascia();'
                  ' await new Promise(r => setTimeout(r, 0)) }')

    # 7. «Pulisci» le settimane: mentre la domanda è aperta nasce una chiusura.
    # L'anno mandato la tiene.
    page.evaluate('''() => {
      const r = prova.stato.registro
      const anni = r.anni.map((a) => a.id === r.annoCorrenteId
        ? { ...a, settimane: { '2026-09-14': 'A' } } : a)
      prova.aggiorna({ registro: { ...r, anni }, schedaDocumento: 'anno' })
    }''')
    page.evaluate(FOTOGRAMMA)
    page.locator('button', has_text='Pulisci').click()
    # Si parla di «tipi di settimana», e una sola settimana marcata si dice al
    # singolare.
    expect(modali).to_contain_text('Togliere tutti i tipi?')
    expect(modali).to_contain_text('1 settimana torna senza tipo.')
    page.evaluate('''() => {
      const r = prova.stato.registro
      const anni = r.anni.map((a) => a.id === r.annoCorrenteId
        ? { ...a, sospensioni: [...a.sospensioni,
            { id: 's-nuova', etichetta: 'Natale', dal: '2026-12-24', al: '2027-01-06' }] } : a)
      prova.aggiorna({ registro: { ...r, anni } })
    }''')
    page.evaluate('richieste.length = 0')
    modali.get_by_role('button', name='Togli tutto').click()
    page.wait_for_function("richieste.some(m=>m.azione?.tipo==='anno.salva')")
    anno = page.evaluate(ULTIMA, 'anno.salva')['anno']
    assert anno['settimane'] == {}, anno['settimane']
    assert any(s['id'] == 's-nuova' for s in anno['sospensioni']), anno['sospensioni']

    assert not errors, errors
    browser.close()

print('corse del giro 12: ok')

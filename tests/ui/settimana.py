"""Allineamenti della vista Settimana, misurati col righello del browser.
Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/settimana.py`

La settimana è una griglia divisa in due — la testata dei giorni ferma, il
corpo che scorre — e le due metà devono combaciare al pixel: se il bordo di
«VEN» non cade sul bordo della colonna del venerdì, la testata dice il giorno
sbagliato. Qui si misura con `getBoundingClientRect`, a tre larghezze e con la
barra laterale aperta e compatta, perché i guasti di questo genere compaiono
solo a certe misure.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

TOLLERANZA = 1
due_frame = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'

# Tutto in una chiamata dentro la pagina: niente ridisegni fra una misura e
# l'altra.
MISURA = r'''() => {
  const r = (e) => e.getBoundingClientRect()
  const q = (s) => [...document.querySelectorAll(s)]
  const testa = q('.settimana__intestazione > *')
  const corpo = q('.settimana__corpo > *')
  const corpoR = r(document.querySelector('.settimana__corpo'))
  const ore = q('.settimana__ora')
  const righe = [...q('.settimana__colonna')[0].querySelectorAll('.settimana__riga-ora')]
  const settimana = r(document.querySelector('.settimana'))
  const striscia = document.querySelector('.striscia-settimane')
  const fila = document.querySelector('.striscia-settimane__voci')
  const accesa = document.querySelector('.striscia-settimane__voce--corrente')
  const blocco = document.querySelector('.settimana__colonna .blocco')
  return {
    colonne: testa.map((t, i) => [r(t).left - r(corpo[i]).left, r(t).right - r(corpo[i]).right]),
    ore: ore.map((o, i) => ({
      testo: o.textContent,
      prima: o.classList.contains('settimana__ora--prima'),
      ultima: o.classList.contains('settimana__ora--ultima'),
      alto: r(o).top, basso: r(o).bottom, riga: r(righe[i]).top,
    })),
    corpo: { alto: corpoR.top, basso: corpoR.bottom },
    blocco: blocco && { alto: r(blocco).top, inizio: blocco.querySelector('.blocco__ora').textContent },
    striscia: {
      sinistra: r(striscia.querySelector('.striscia-settimane__testata')).left - settimana.left,
      fila: [r(fila).left, r(fila).right],
      accesa: accesa && [r(accesa).left, r(accesa).right],
    },
  }
}'''


def controlla(m, dove):
    for i, (sx, dx) in enumerate(m['colonne']):
        assert abs(sx) <= TOLLERANZA and abs(dx) <= TOLLERANZA, (dove, 'colonna', i, sx, dx)
    righe = {o['testo']: o['riga'] for o in m['ore']}
    for o in m['ore']:
        # Ogni etichetta sta tutta dentro il corpo: fuori la taglia il bordo.
        assert o['alto'] >= m['corpo']['alto'] - TOLLERANZA, (dove, 'ora tagliata sopra', o)
        assert o['basso'] <= m['corpo']['basso'] + TOLLERANZA, (dove, 'ora tagliata sotto', o)
        # E dice la riga su cui sta: a cavallo in mezzo, appoggiata sui bordi.
        if o['prima']:
            assert abs(o['alto'] - o['riga']) <= TOLLERANZA, (dove, o)
        elif o['ultima']:
            assert abs(o['basso'] - o['riga']) <= TOLLERANZA, (dove, o)
        else:
            assert abs((o['alto'] + o['basso']) / 2 - o['riga']) <= TOLLERANZA, (dove, o)
    # La lezione delle 08:20 comincia a un terzo fra la riga delle 8 e quella delle 9.
    assert m['blocco'] and m['blocco']['inizio'] == '08:20', (dove, m['blocco'])
    atteso = righe['08:00'] + (righe['09:00'] - righe['08:00']) / 3
    assert abs(m['blocco']['alto'] - atteso) <= TOLLERANZA, (dove, 'blocco', m['blocco']['alto'], atteso)
    # La striscia ha il suo margine dentro il riquadro, e la settimana aperta si vede.
    assert m['striscia']['sinistra'] >= 4, (dove, 'striscia a filo del bordo', m['striscia'])
    sx, dx = m['striscia']['fila']
    a_sx, a_dx = m['striscia']['accesa']
    assert a_sx >= sx - TOLLERANZA and a_dx <= dx + TOLLERANZA, (dove, 'settimana accesa fuori vista', m['striscia'])


# ------------------------------------------------------------ riconfigurazioni
#
# La fascia oraria ferma, la striscia che si ripiega, sabato e domenica dalla
# barra, «Oggi» che porta anche all'ora di adesso.

# Il ponte con la memoria dell'interfaccia: `setState` si tiene da parte per
# vedere che cosa il pannello ricorderebbe.
PONTE = ('window.richieste=[]; window.ricordato=null; window.acquireVsCodeApi=()=>({'
         'getState:()=>null,setState:s=>{window.ricordato=s},postMessage:m=>{richieste.push(m);'
         " if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',"
         "{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})")

ORE = r"""() => {
  const corpo = document.querySelector('.settimana__corpo').getBoundingClientRect()
  return [...document.querySelectorAll('.settimana__ora')]
    .map((o) => [o.textContent, Math.round(o.getBoundingClientRect().top - corpo.top)])
}"""

MISURA_COLONNE = r"""() => {
  const r = (e) => e.getBoundingClientRect()
  const testa = [...document.querySelectorAll('.settimana__intestazione > *')]
  const corpo = [...document.querySelectorAll('.settimana__corpo > *')]
  return testa.map((t, i) => [r(t).left - r(corpo[i]).left, r(t).right - r(corpo[i]).right])
}"""

SCATTI = root / 'dist-tests'


def controlla_colonne(colonne, dove):
    for i, (sx, dx) in enumerate(colonne):
        assert abs(sx) <= TOLLERANZA and abs(dx) <= TOLLERANZA, (dove, 'colonna', i, sx, dx)


def apri(browser, altezza=1000):
    page = browser.new_page(viewport={'width': 1440, 'height': altezza})
    errori = []
    page.on('pageerror', lambda e: errori.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
    page.evaluate("prova.aggiorna({modoCalendario:'settimana', data:'2026-09-14'})")
    page.evaluate(due_frame)
    return page, errori


def fascia_fissa(browser):
    """Le ore della giornata vengono dalle Impostazioni: stesse ore, stessa altezza, ogni settimana."""
    page, errori = apri(browser)
    piena = page.evaluate(ORE)
    page.evaluate("prova.aggiorna({data:'2026-09-21'})")
    page.evaluate(due_frame)
    vuota = page.evaluate(ORE)
    assert piena == vuota, ('la fascia cambia con le lezioni', piena, vuota)
    # 07:30–18:00 di serie: la griglia va dalle 7 alle 18, a ore piene.
    assert piena[0][0] == '07:00' and piena[-1][0] == '18:00', piena
    # Una lezione fuori fascia allarga la sua settimana, e basta.
    page.evaluate("""()=>{const r=structuredClone(prova.stato.registro);
      const l=structuredClone(r.lezioni[0]); l.id='prova-sera'; l.data='2026-09-29'; l.slot=l.slot.map(x=>({...x, inizio:'19:00', fine:'19:45'}));
      r.lezioni.push(l); prova.aggiorna({registro:r, data:'2026-09-28'})}""")
    page.evaluate(due_frame)
    sera = page.evaluate(ORE)
    assert sera[-1][0] >= '20:00', ('la lezione delle 19 fuori dalla griglia', sera)
    dentro = page.evaluate("""()=>{const b=document.querySelector('.settimana__colonna .blocco');
      const c=document.querySelector('.settimana__corpo').getBoundingClientRect(); const r=b.getBoundingClientRect();
      return r.top>=c.top-1 && r.bottom<=c.bottom+1}""")
    assert dentro, 'il blocco delle 19 sta fuori dal corpo'
    page.evaluate("prova.aggiorna({data:'2026-10-05'})")
    page.evaluate(due_frame)
    assert page.evaluate(ORE) == piena, 'la settimana dopo resta allargata'
    assert not errori, errori
    page.close()


def striscia_ripiegabile(browser):
    """La striscia delle settimane si chiude in una riga, e se lo ricorda."""
    page, errori = apri(browser)
    pulsante = page.locator('.striscia-settimane__ripiega')
    expect(pulsante).to_have_attribute('aria-expanded', 'true')
    expect(page.locator('.striscia-settimane__voci')).to_be_visible()
    aperta = page.evaluate("document.querySelector('.striscia-settimane').getBoundingClientRect().height")
    page.screenshot(path=str(SCATTI / 'striscia-aperta.png'))
    pulsante.click()
    page.evaluate(due_frame)
    pulsante = page.locator('.striscia-settimane__ripiega')
    expect(pulsante).to_have_attribute('aria-expanded', 'false')
    expect(page.locator('.striscia-settimane__voci')).to_have_count(0)
    # Il titolo resta: chiusa è una riga, non un vuoto.
    expect(page.locator('.striscia-settimane__testata')).to_contain_text('Settimane dell')
    chiusa = page.evaluate("document.querySelector('.striscia-settimane').getBoundingClientRect().height")
    assert chiusa < aperta * 0.6 and chiusa < 34, (aperta, chiusa)
    assert page.evaluate('window.ricordato && window.ricordato.strisciaSettimaneChiusa') is True
    page.screenshot(path=str(SCATTI / 'striscia-chiusa.png'))
    # Chiusa, la testata dei giorni combacia ancora col corpo.
    controlla_colonne(page.evaluate(MISURA_COLONNE), 'striscia chiusa')
    pulsante.click()
    page.evaluate(due_frame)
    expect(page.locator('.striscia-settimane__ripiega')).to_have_attribute('aria-expanded', 'true')
    assert page.evaluate('window.ricordato.strisciaSettimaneChiusa') is False
    assert not errori, errori
    page.close()




def modifica(browser):
    """«Modifica» arma la griglia: il clic sceglie, sul vuoto si disegna, Esc esce.

    «Sab/Dom» non sta più nella barra: sabato e domenica si accendono dai
    «Giorni mostrati» delle Impostazioni. «Nuova ora» compare solo in modifica,
    accanto a lei, come i comandi del calendario ICS.
    """
    page, errori = apri(browser)
    nuova = '[data-fuoco="comando-registro.nuovaLezione"]'
    assert page.locator('[data-fuoco="comando-calendario.finesettimana"]').count() == 0
    assert page.locator(nuova).count() == 0
    interruttore = page.locator('[data-fuoco="comando-calendario.editor"]')
    expect(interruttore).to_have_attribute('aria-pressed', 'false')
    interruttore.click()
    page.evaluate(due_frame)
    assert page.evaluate('prova.stato.editorCalendario') is True
    expect(page.locator('.vista--calendario-editor')).to_have_count(1)
    expect(page.locator(nuova)).to_be_visible()
    expect(page.locator('[data-fuoco="comando-calendario.editor"]')).to_have_attribute('aria-pressed', 'true')

    # Due ore alla stessa ora, una per classe: la settimana non le affianca (un
    # docente non sta in due aule) e le sovrapposizioni si segnalano. Il filtro
    # del corso ne lascia una, e serve anche più sotto.
    corso = page.evaluate('prova.stato.registro.lezioni[0].corsoId')
    page.evaluate(f"prova.aggiorna({{filtroCorsoAgendaId:'{corso}'}})")
    page.evaluate(due_frame)
    expect(page.locator('.settimana__colonna .blocco')).to_have_count(1)

    # Il clic su un'ora la sceglie e non la apre; le maniglie ci sono.
    blocco = page.locator('.settimana__colonna .blocco').first
    blocco.click()
    assert page.evaluate('prova.stato.vista') == 'calendario'
    expect(blocco).to_have_class(re.compile(r'blocco--scelto'))
    assert blocco.locator('.blocco__maniglia').count() == 2
    page.screenshot(path=str(SCATTI / 'editor-scelta.png'))

    # Sul vuoto dell'ultima colonna, dalle 15 per un'ora e mezza: due UD con
    # un'azione sola. Col filtro del corso nasce subito; senza, si apre il modulo
    # compilato.
    fascia = page.evaluate("""()=>{const c=[...document.querySelectorAll('.settimana__colonna')].at(-1);
      const r=c.getBoundingClientRect(); return {x:r.left+r.width/2, alto:r.top, h:r.height}}""")
    per_minuto = fascia['h'] / (11 * 60)  # 07:00–18:00
    y = fascia['alto'] + (15 * 60 - 7 * 60) * per_minuto
    page.evaluate('richieste.length = 0')
    page.mouse.move(fascia['x'], y)
    page.mouse.down()
    page.mouse.move(fascia['x'], y + 40 * per_minuto, steps=4)
    page.mouse.move(fascia['x'], y + 90 * per_minuto, steps=4)
    page.evaluate(due_frame)
    expect(page.locator('.settimana__bozza')).to_be_visible()
    page.mouse.up()
    page.wait_for_function("richieste.some(m => m.azione?.tipo === 'lezione.salva')")
    salvate = page.evaluate("richieste.filter(m => m.azione?.tipo === 'lezione.salva').map(m => m.azione.lezione.slot)")
    assert len(salvate) == 1, salvate
    [slot] = salvate[0]
    assert slot['inizio'] == '15:00' and slot['fine'] == '16:30', slot
    assert page.locator('.settimana__bozza').count() == 0

    # Esc lascia la scelta, il secondo esce dalla modifica.
    page.keyboard.press('Escape')
    page.keyboard.press('Escape')
    page.evaluate(due_frame)
    assert page.evaluate('prova.stato.editorCalendario') is False
    assert page.locator('.vista--calendario-editor').count() == 0
    assert page.locator(nuova).count() == 0
    assert not errori, errori
    page.close()


def oggi_all_ora(browser):
    """«Oggi» porta alla settimana di oggi e all'ora di adesso; il resto ricorda lo scorrimento."""
    page, errori = apri(browser, altezza=560)
    page.evaluate("""()=>{const r=structuredClone(prova.stato.registro);
      r.impostazioni.giorniVisibili=[1,2,3,4,5,6,7]; prova.aggiorna({registro:r, adessoOra:'16:30'})}""")
    page.evaluate(due_frame)
    scorre = page.locator('.settimana__scorrevole')
    assert scorre.evaluate('(e) => e.scrollHeight > e.clientHeight + 100'), 'il corpo non scorre: la prova non prova niente'
    scorre.evaluate('(e) => { e.scrollTop = 0 }')
    page.locator('[data-fuoco="comando-registro.oggi"]').click()
    page.evaluate(due_frame)
    page.evaluate(due_frame)
    assert page.evaluate('prova.stato.data') == page.evaluate('prova.stato.adessoData')
    dove = page.evaluate("""()=>{const a=document.querySelector('.settimana__adesso').getBoundingClientRect();
      const s=document.querySelector('.settimana__scorrevole').getBoundingClientRect();
      return {riga:a.top, alto:s.top, basso:s.bottom}}""")
    assert dove['alto'] + 24 <= dove['riga'] <= dove['basso'] - 8, ('la riga di adesso fuori vista', dove)
    # Avanti: lo scorrimento resta quello di prima, non torna su adesso.
    page.locator('.settimana__scorrevole').evaluate('(e) => { e.scrollTop = 40 }')
    page.locator('[data-fuoco="comando-calendario.avanti"]').click()
    page.evaluate(due_frame)
    page.evaluate(due_frame)
    assert page.locator('.settimana__scorrevole').evaluate('(e) => e.scrollTop') == 40
    # Un ridisegno qualunque, idem.
    page.evaluate('prova.aggiorna({})')
    page.evaluate(due_frame)
    page.evaluate(due_frame)
    assert page.locator('.settimana__scorrevole').evaluate('(e) => e.scrollTop') == 40
    assert not errori, errori
    page.close()


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
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
    # Settembre, e maggio con la settimana accesa in fondo alla striscia: resta
    # visibile anche su finestra stretta.
    for data in ['2026-09-14', '2027-05-10']:
        page.evaluate(f"prova.aggiorna({{modoCalendario:'settimana', data:'{data}'}})")
        if data != '2026-09-14':
            # Anche maggio ha la sua lezione delle 08:20, così le misure sono le stesse.
            page.evaluate(f"""()=>{{const r=structuredClone(prova.stato.registro);
              const l=structuredClone(r.lezioni[0]); l.id='prova-maggio'; l.data='{data}';
              r.lezioni.push(l); prova.aggiorna({{registro:r}})}}""")
        for larghezza in [1440, 1100, 900]:
            for barra in ['aperta', 'compatta']:
                page.set_viewport_size({'width': larghezza, 'height': 1000})
                page.evaluate(due_frame)
                larga = page.evaluate("document.querySelector('#navigazione-laterale').getBoundingClientRect().width")
                if (barra == 'compatta') != (larga < 120):
                    page.locator('[data-fuoco="apri-navigazione"]').first.click()
                page.evaluate(due_frame)
                controlla(page.evaluate(MISURA), (data, larghezza, barra))
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.evaluate("prova.aggiorna({data:'2026-09-14'})")
    page.evaluate(due_frame)
    page.screenshot(path=str(root / 'dist-tests/settimana.png'))
    assert not errors, errors
    for caso in (fascia_fissa, striscia_ripiegabile, modifica, oggi_all_ora):
        caso(browser)
    browser.close()

print('OK: settimana — testata e corpo combaciano, ore dentro il corpo e sulla loro riga, blocchi all\'ora giusta, striscia col suo margine e la settimana accesa in vista; fascia ferma, striscia ripiegabile, Modifica, Oggi all\'ora di adesso')

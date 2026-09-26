"""Quel che si sta scrivendo non si perde, e non riporta indietro il resto.

Due difetti della stessa famiglia, provati qui insieme.

L'editor del piano, nella pagina Piani, resta in memoria fra un ridisegno e
l'altro — è quel che permette di scriverci mentre l'host spinge dati nuovi. Ma
teneva anche la scaletta **vecchia**: cambiato il piano altrove (la matita del
registro dell'ora, l'API, un altro computer), la pagina continuava a mostrare
le tappe di prima, e al primo campo lasciato `piano.salva` le rimandava
indietro intere. La tappa aggiunta altrove spariva senza un avviso. Prima della
correzione il conto delle tappe qui sotto restava 2.

Ctrl+S non consegnava il campo in cui si stava scrivendo: i campi salvano su
`change`, cioè uscendo, e `stato.salva` partiva senza quel testo dicendo
«Tutto salvato.». Prima della correzione nessun `piano.salva` con la nota
precedeva lo `stato.salva`.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/staleEdits.py`
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]

# Un piano con due tappe, sull'ora del primo corso. Serve solo a queste prove.
PREPARA = '''() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const tappa = (id, titolo) => ({ id, titolo, tipo: 'spiegazione', durataUd: 1, descrizione: '',
    materiali: '', raggruppamento: 'plenaria', risorse: [] })
  const piano = { id: 'piano-prova', corsoId: corso.id, obiettivi: ['Le frazioni'], prerequisiti: '',
    attivita: [tappa('t1', 'Apertura'), tappa('t2', 'Esercizi')], risorse: [], note: '', tag: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  const lezioni = r.lezioni.map((l) => l.corsoId === corso.id ? { ...l, pianoId: piano.id } : l)
  prova.aggiorna({ registro: { ...r, piani: [piano], lezioni }, vista: 'piani', corsoId: corso.id,
    pianoId: piano.id })
}'''

# Lo stesso piano cambiato altrove, con una tappa in più: un registro nuovo,
# come quello che l'host spinge dopo ogni scrittura.
CAMBIA_ALTROVE = '''() => {
  const r = prova.stato.registro
  const piani = r.piani.map((p) => p.id !== 'piano-prova' ? p : { ...p,
    attivita: [...p.attivita, { ...p.attivita[0], id: 't3', titolo: 'Verifica lampo' }],
    aggiornatoIl: '2026-09-02T08:00:00.000Z' })
  prova.aggiorna({ registro: { ...r, piani } })
}'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.tutte=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); tutte.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')

    page.evaluate(PREPARA)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    tappe = page.locator('.piano-editor input.attivita-riga__titolo')
    assert tappe.count() == 2, f'l’editor non mostra le due tappe del piano: {tappe.count()}'

    # Il piano cambia altrove mentre la pagina è aperta, e il fuoco non è
    # nell'editor: la pagina deve mostrare la scaletta nuova.
    page.evaluate('() => document.activeElement?.blur()')
    page.evaluate(CAMBIA_ALTROVE)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert tappe.count() == 3, f'l’editor mostra ancora la scaletta vecchia: {tappe.count()} tappe'

    # E quel che salva adesso parte dalla scaletta nuova, con la tappa di
    # altrove dentro.
    note = page.locator('.piano-editor textarea[name="note"]')
    page.evaluate('richieste.length = 0')
    note.fill('portare i fogli quadrettati')
    note.evaluate('(el) => el.blur()')
    salvato = page.evaluate(
        "richieste.filter(m=>m.azione?.tipo==='piano.salva').map(m=>m.azione.piano).at(-1) ?? null"
    )
    assert salvato, 'uscire dalla nota non ha salvato il piano'
    assert [a['id'] for a in salvato['attivita']] == ['t1', 't2', 't3'], \
        f'il salvataggio ha riportato indietro la scaletta: {[a["id"] for a in salvato["attivita"]]}'

    # Ctrl+S con il cursore ancora nella nota: prima parte il campo, poi il
    # salvataggio del registro.
    page.evaluate('richieste.length = 0')
    note.focus()
    page.keyboard.type(' e il righello')
    page.keyboard.press('Control+s')
    tipi = page.evaluate('richieste.map(m=>m.azione?.tipo ?? null)')
    assert 'stato.salva' in tipi, f'Ctrl+S non ha chiesto di salvare: {tipi}'
    prima = tipi[:tipi.index('stato.salva')]
    assert 'piano.salva' in prima, f'Ctrl+S è partito senza consegnare il campo: {tipi}'
    nota = page.evaluate(
        "richieste.filter(m=>m.azione?.tipo==='piano.salva').at(-1).azione.piano.note"
    )
    assert nota == 'portare i fogli quadrettati e il righello', f'nota consegnata storta: {nota!r}'
    # E il cursore è ancora lì: si continua a scrivere.
    assert page.evaluate("document.activeElement?.getAttribute('name')") == 'note', 'Ctrl+S ha tolto il fuoco'

    assert not errors, f'errori JS: {errors}'
    browser.close()

print('modifiche vecchie: ok')

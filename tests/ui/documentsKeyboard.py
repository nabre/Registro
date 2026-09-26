"""Apertura dei documenti da tastiera, nelle righe e nella matrice.

Esecuzione: `node esbuild.mjs --ui` e poi
`python tests/ui/documentsKeyboard.py`.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


root = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.acquireVsCodeApi=()=>({
      getState:()=>null,setState:()=>{},postMessage:m=>{
        if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{
          data:{tipo:'risposta',id:m.id,ok:true}})),0)
      }})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))

    # Riga: il nome visibile e' un vero pulsante. Invio e Spazio aprono il PDF.
    percorso_riga = page.evaluate("""() => {
      const r = prova.stato.registro
      const c = r.corsi[0]
      const d = prova.collocazioneDi(r, 'presenze', c.id, {semestreId: null})
      const percorso = prova.percorsoDi(d)
      prova.aggiorna({vista: 'documenti', paginaId: null, schedaDocumenti: 'corso',
        corsoId: c.id, filtroClasseId: c.classeId, semestreId: null,
        esportati: [{percorso, misura: 10, revisione: 0}], anteprima: null})
      return percorso
    }""")
    apri_nome = page.locator('.documenti__riga--apribile .documenti__nome-apri').first
    expect(apri_nome).to_be_enabled()
    expect(apri_nome).to_have_accessible_name('Presenze')
    apri_nome.focus()
    page.keyboard.press('Enter')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_riga)
    assert page.evaluate('prova.stato.anteprima') == percorso_riga
    page.evaluate('prova.aggiorna({anteprima: null})')
    apri_nome = page.locator('.documenti__riga--apribile .documenti__nome-apri').first
    apri_nome.focus()
    page.keyboard.press('Space')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_riga)
    assert page.evaluate('prova.stato.anteprima') == percorso_riga

    # Matrice: la lente resta il controllo dedicato e riceve entrambi i tasti.
    percorso_cella = page.evaluate("""() => {
      const r = prova.stato.registro
      const c = r.corsi[0]
      const lezione = {id: 'lezione-tastiera', corsoId: c.id, data: '2026-09-15',
        slot: [{id: 'slot-tastiera', inizio: '08:00', fine: '08:45', tipo: 'lezione'}],
        aula: '', stato: 'svolta', pianoId: null, avanzamento: [], presenze: [],
        osservazioni: [], matrice: [], argomenti: '', materiali: '', consuntivo: '',
        creataIl: '2026-09-15T08:00:00.000Z', aggiornataIl: '2026-09-15T08:00:00.000Z'}
      const registro = structuredClone(r)
      registro.lezioni.push(lezione)
      const d = prova.collocazioneDi(registro, 'lezione', lezione.id, {corsoId: c.id})
      const percorso = prova.percorsoDi(d)
      prova.aggiorna({registro, schedaDocumenti: 'lezioni', corsoId: c.id,
        filtroClasseId: c.classeId,
        esportati: [{percorso, misura: 10, revisione: 0}], anteprima: null})
      return percorso
    }""")
    apri_cella = page.locator('.documenti__cella--apribile .documenti__apri').first
    expect(apri_cella).to_be_enabled()
    expect(apri_cella).not_to_have_attribute('aria-label', '')
    apri_cella.focus()
    page.keyboard.press('Enter')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_cella)
    assert page.evaluate('prova.stato.anteprima') == percorso_cella
    page.evaluate('prova.aggiorna({anteprima: null})')
    apri_cella = page.locator('.documenti__cella--apribile .documenti__apri').first
    apri_cella.focus()
    page.keyboard.press('Space')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_cella)
    assert page.evaluate('prova.stato.anteprima') == percorso_cella

    assert errors == [], errors
    browser.close()

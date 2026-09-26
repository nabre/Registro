"""Errori modali: riepilogo annunciato, descritto e focalizzato dopo submit."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:m.azione?.tipo==='composizione.crea'?{tipo:'risposta',id:m.id,ok:false,errori:['Nome già usato']}:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))

    # Due PDF selezionati rendono disponibile la modale Composizione.
    page.evaluate("""()=>{const r=prova.stato.registro, c=r.corsi[0];
      prova.aggiorna({vista:'documenti',paginaId:null,schedaDocumenti:'corso',corsoId:c.id,
        filtroClasseId:c.classeId,documentiScelti:['esportazioni/a.pdf','esportazioni/b.pdf'],
        esportati:[{percorso:'esportazioni/a.pdf',misura:10,revisione:0},
                   {percorso:'esportazioni/b.pdf',misura:10,revisione:0}],anteprima:null})}""")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    page.locator('[data-fuoco="comando-documenti.combina"]').click()

    dialogo = page.get_by_role('dialog')
    riepilogo = dialogo.get_by_role('alert')
    expect(riepilogo).to_have_attribute('aria-live', 'assertive')
    expect(riepilogo).to_have_attribute('aria-atomic', 'true')
    expect(riepilogo).to_have_attribute('tabindex', '-1')
    assert dialogo.get_attribute('aria-describedby') == riepilogo.get_attribute('id')

    # Risposta negativa al submit: errore visibile e fuoco sul riepilogo.
    dialogo.get_by_role('textbox', name='Nome della composizione').fill('Duplicato')
    dialogo.get_by_role('button', name='Combina', exact=True).click()
    expect(riepilogo.locator('li')).to_have_count(1)
    expect(riepilogo).to_be_focused()
    assert riepilogo.inner_text().strip()
    # Nessuna aria-invalid inventata: errore non porta un identificatore di campo.
    expect(dialogo.locator('[aria-invalid="true"]')).to_have_count(0)

    assert not errors, errors
    browser.close()

print('errori modali: ok')

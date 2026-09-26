"""Schede delle impostazioni: relazioni ARIA, roving tabindex e tastiera APG."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.evaluate("prova.aggiorna({vista:'impostazioni',ambitoImpostazioni:'documento',schedaDocumento:'anno'})")
    page.evaluate('()=>new Promise(requestAnimationFrame)')

    # I gruppi cambiano insieme di schede: pulsanti, non una falsa tablist annidata.
    gruppi = page.locator('.impostazioni__gruppi')
    expect(gruppi).not_to_have_attribute('role', 'tablist')
    expect(gruppi.locator('button[aria-pressed="true"]')).to_have_count(1)

    lista = page.locator('.impostazioni__sezioni[role="tablist"]')
    expect(lista).to_have_count(1)
    schede = lista.get_by_role('tab')
    assert schede.count() > 1
    expect(lista.locator('[role="tab"][aria-selected="true"]')).to_have_count(1)
    expect(lista.locator('[role="tab"][tabindex="0"]')).to_have_count(1)
    expect(lista.locator('[role="tab"][tabindex="-1"]')).to_have_count(schede.count() - 1)

    pannello = page.get_by_role('tabpanel')
    attiva = lista.locator('[role="tab"][aria-selected="true"]')
    assert attiva.get_attribute('aria-controls') == pannello.get_attribute('id')
    assert pannello.get_attribute('aria-labelledby') == attiva.get_attribute('id')

    # Attivazione automatica. Il ridisegno conserva fuoco sulla nuova scheda.
    attiva.focus()
    page.keyboard.press('ArrowRight')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    nuova = page.locator('.impostazioni__sezioni [role="tab"][aria-selected="true"]')
    expect(nuova).to_be_focused()
    expect(nuova).to_have_attribute('tabindex', '0')

    page.keyboard.press('End')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.impostazioni__sezioni [role="tab"]').last).to_be_focused()
    page.keyboard.press('Home')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.impostazioni__sezioni [role="tab"]').first).to_be_focused()
    page.keyboard.press('ArrowLeft')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.impostazioni__sezioni [role="tab"]').last).to_be_focused()
    page.keyboard.press('ArrowUp')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.impostazioni__sezioni [role="tab"]').nth(-2)).to_be_focused()

    assert not errors, errors
    browser.close()

print('impostazioni tastiera: ok')

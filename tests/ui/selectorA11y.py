"""Scelte alternative: radio complete, una scelta e movimento da tastiera."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(
        '<html lang="it"><head><title>Regiclass</title></head>'
        '<body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.acquireVsCodeApi=()=>({
      getState:()=>null,setState:()=>{},postMessage:m=>{
        if(m.id)setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{
          data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.evaluate("""()=>{
      const corso=prova.stato.registro.corsi[0]
      prova.scegliCorso(corso.id)
      prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.registro'))
    }""")
    page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')

    gruppi = page.get_by_role('radiogroup')
    assert gruppi.count() > 0
    for indice in range(gruppi.count()):
        gruppo = gruppi.nth(indice)
        radio = gruppo.get_by_role('radio')
        assert radio.count() > 1
        expect(gruppo.locator('[role="radio"][aria-checked="true"]')).to_have_count(1)
        expect(gruppo.locator('[role="radio"][tabindex="0"]')).to_have_count(1)
        expect(gruppo.locator('[role="radio"][aria-checked="false"]')).to_have_count(
            radio.count() - 1)

    gruppo = gruppi.first
    attiva = gruppo.locator('[role="radio"][aria-checked="true"]')
    attiva.focus()
    page.keyboard.press('ArrowRight')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    nuova = page.get_by_role('radiogroup').first.locator(
        '[role="radio"][aria-checked="true"]')
    expect(nuova).to_be_focused()
    expect(nuova).to_have_attribute('tabindex', '0')

    assert not errors, errors
    browser.close()

print('selectorA11y: ok')

"""Misure leggibili e bersagli coerenti, provati sui fogli reali in Chromium.

Esecuzione isolata: `node esbuild.mjs --ui && python tests/ui/readability.py`.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]


def numero(valore: str) -> float:
    return float(valore.removesuffix('px'))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 720, 'height': 480})
    page.set_content('''<html lang="it"><body>
      <main class="prova">
        <button class="pulsante">Salva</button>
        <button class="pulsante pulsante--minuto" aria-label="Elimina">
          <svg class="icona"></svg>
        </button>
        <span class="nota">Nota operativa</span>
        <span class="selettore"><button class="selettore__voce">Mese</button></span>
        <label class="campo"><span class="campo__etichetta">Titolo</span>
          <input class="campo__controllo">
          <span class="campo__aiuto">Indicazione del campo</span>
        </label>
        <nav class="barra-comandi"><div class="barra-comandi__corpo">
          <div class="barra-comandi__comandi">
            <button class="comando" aria-pressed="true">Settimana</button>
            <button class="comando" aria-pressed="false">Mese</button>
          </div>
        </div></nav>
      </main>
    </body></html>''')
    for foglio in ('theme.css', 'metrics.css', 'controls.css', 'command-bar.css'):
        page.add_style_tag(path=str(root / 'src' / 'ui' / 'styles' / foglio))
    page.add_style_tag(content='''
      body { margin: 0; font: var(--corpo)/var(--interlinea) var(--carattere); }
      .prova { display: flex; flex-wrap: wrap; gap: 8px; }
      .nota { font-size: var(--corpo-minuto); }
      .campo { flex-basis: 220px; }
      .barra-comandi { flex-basis: 100%; padding: 0; }
    ''')

    assert numero(page.locator('body').evaluate('(e) => getComputedStyle(e).fontSize')) == 14
    assert numero(page.locator('.nota').evaluate('(e) => getComputedStyle(e).fontSize')) >= 12
    assert numero(page.locator('.campo__aiuto').evaluate('(e) => getComputedStyle(e).fontSize')) >= 12

    for selettore in ('.pulsante', '.pulsante--minuto', '.selettore__voce',
                      '.campo__controllo', '.comando'):
        scatola = page.locator(selettore).first.bounding_box()
        assert scatola and scatola['height'] >= 32, (selettore, scatola)
    minuto = page.locator('.pulsante--minuto').bounding_box()
    assert minuto and minuto['width'] >= 32, minuto

    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

    # La scala di Windows cambia la radice. Testo e gradini devono seguirla.
    page.locator('html').evaluate("e => e.style.fontSize = '20px'")
    assert numero(page.locator('body').evaluate('(e) => getComputedStyle(e).fontSize')) == 17.5
    assert numero(page.locator('.nota').evaluate('(e) => getComputedStyle(e).fontSize')) >= 15

    nativa = browser.new_page(viewport={'width': 720, 'height': 480})
    nativa.set_content('''<input type="text"><button>Salva</button>
      <button class="minuto">X</button>''')
    nativa.add_style_tag(path=str(root / 'src' / 'ui' / 'styles' / 'theme.css'))
    nativa.add_style_tag(path=str(root / 'src' / 'ui' / 'styles' / 'metrics.css'))
    nativa.add_style_tag(path=str(root / 'shell' / 'pages' / 'shared' / 'base.css'))
    for selettore in ('input', 'button', 'button.minuto'):
        scatola = nativa.locator(selettore).first.bounding_box()
        assert scatola and scatola['height'] >= 32, (selettore, scatola)
    browser.close()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 720, 'height': 480}, has_touch=True)
    page = context.new_page()
    page.set_content('''<button class="pulsante pulsante--minuto">A</button>
      <div class="barra-comandi__comandi">
        <button class="comando" aria-pressed="true">Mese</button>
        <button class="comando" aria-pressed="false">Anno</button>
      </div>''')
    for foglio in ('theme.css', 'metrics.css', 'controls.css', 'command-bar.css'):
        page.add_style_tag(path=str(root / 'src' / 'ui' / 'styles' / foglio))
    for selettore in ('.pulsante--minuto', '.comando'):
        scatola = page.locator(selettore).first.bounding_box()
        assert scatola and scatola['height'] >= 44, (selettore, scatola)
    minuto = page.locator('.pulsante--minuto').bounding_box()
    assert minuto and minuto['width'] >= 44, minuto
    browser.close()

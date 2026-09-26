"""Contrasto dei numeri delle settimane vuote, nei temi chiaro e scuro.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: ``node esbuild.mjs --ui`` e poi
``python tests/ui/calendarContrast.py``.
"""
import re
from pathlib import Path

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[2]

PONTE = '''
window.richieste = []
window.acquireVsCodeApi = () => ({
  getState: () => null, setState: () => {},
  postMessage: (m) => {
    richieste.push(m)
    if (m.id) setTimeout(() => window.dispatchEvent(new MessageEvent('message',
      { data: { tipo: 'risposta', id: m.id, ok: true } })), 0)
  },
})
'''

FRAME = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'
SELETTORE = '.striscia-settimane__voce--vuota .striscia-settimane__numero'


def rgb(valore):
    canali = re.match(r'rgba?\((\d+),\s*(\d+),\s*(\d+)', valore)
    assert canali, f'colore non riconosciuto: {valore}'
    return tuple(int(canale) for canale in canali.groups())


def luminanza(colore):
    def lineare(canale):
        valore = canale / 255
        return valore / 12.92 if valore <= 0.04045 else ((valore + 0.055) / 1.055) ** 2.4

    rosso, verde, blu = (lineare(canale) for canale in colore)
    return 0.2126 * rosso + 0.7152 * verde + 0.0722 * blu


def rapporto(primo, secondo):
    chiaro, scuro = sorted((luminanza(primo), luminanza(secondo)), reverse=True)
    return (chiaro + 0.05) / (scuro + 0.05)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    risultati = {}
    for schema in ('light', 'dark'):
        page = browser.new_page(
            viewport={'width': 1440, 'height': 1000},
            color_scheme=schema,
            reduced_motion='reduce',
        )
        errori = []
        page.on('pageerror', lambda errore: errori.append(str(errore)))
        page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
        page.add_script_tag(content=PONTE)
        page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
        page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
        page.evaluate("prova.vaiA(prova.PAGINE.find(pagina=>pagina.id==='pagina.calendario'))")
        page.evaluate(FRAME)

        numeri = page.locator(SELETTORE)
        assert numeri.count() > 0, f'nessuna settimana vuota nel tema {schema}'
        for indice in range(numeri.count()):
            stile = numeri.nth(indice).evaluate('''elemento => {
              const voce = elemento.closest('.striscia-settimane__voce')
              const testo = getComputedStyle(elemento)
              const contenitore = getComputedStyle(voce)
              return {
                color: testo.color,
                background: contenitore.backgroundColor,
                opacity: Number(contenitore.opacity),
              }
            }''')
            assert stile['opacity'] == 1, f'{schema}: testo attenuato con opacity {stile["opacity"]}'
            contrasto = rapporto(rgb(stile['color']), rgb(stile['background']))
            assert contrasto >= 4.5, (
                f'{schema}: contrasto {contrasto:.2f}:1, '
                f'{stile["color"]} su {stile["background"]}')
            risultati[schema] = contrasto

        assert not errori, f'errori JavaScript ({schema}): {errori}'
        page.close()
    browser.close()

print('calendarContrast: ok; ' + ', '.join(
    f'{schema} {valore:.2f}:1' for schema, valore in risultati.items()))

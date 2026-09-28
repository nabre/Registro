"""Contrasto dei numeri delle settimane vuote, nei temi chiaro e scuro.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: ``node esbuild.mjs --ui`` e poi
``python tests/ui/calendarContrast.py``.
"""
import re

from banco import FRAME, chromium, pannello

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


with chromium() as browser:
    risultati = {}
    for schema in ('light', 'dark'):
        page, errori = pannello(browser, color_scheme=schema, reduced_motion='reduce')
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

print('calendarContrast: ok; ' + ', '.join(
    f'{schema} {valore:.2f}:1' for schema, valore in risultati.items()))

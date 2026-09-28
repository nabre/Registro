"""Gate WCAG automatico dell'intera shell Regiklass con axe-core locale.

Costruire prima i bundle con ``node esbuild.mjs --ui``. Il test visita ogni
pagina dichiarata dall'app in entrambi gli schemi colore. Fallisce solo per
violazioni WCAG di impatto ``critical`` o ``serious``; stampa regola, pagina e
selettori, senza scaricare codice da CDN.
"""
from collections import defaultdict

from banco import FRAME, PAGINA_CON_TITOLO, RADICE, chromium, pannello

axe = RADICE / 'node_modules/axe-core/axe.min.js'
if not axe.is_file():
    raise RuntimeError('axe-core non installato: eseguire npm install')

CONFIGURAZIONE = {
    'runOnly': {
        'type': 'tag',
        'values': ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
    'resultTypes': ['violations'],
}


def prepara(browser, schema):
    # Niente campionamento durante la dissolvenza d'ingresso: axe altrimenti
    # misura il testo semitrasparente a metà animazione e produce falsi contrasti.
    page, errori = pannello(browser, html=PAGINA_CON_TITOLO, color_scheme=schema,
                            reduced_motion='reduce')
    page.add_script_tag(path=str(axe))
    return page, errori


def controlla(page, schema, pagina, trovate):
    risultato = page.evaluate(
        'configurazione => axe.run(document, configurazione)', CONFIGURAZIONE)
    for violazione in risultato['violations']:
        if violazione['impact'] not in ('critical', 'serious'):
            continue
        chiave = (violazione['id'], violazione['impact'], violazione['help'])
        for nodo in violazione['nodes']:
            trovate[chiave].append((schema, pagina, ' '.join(nodo['target'])))


def formato(trovate):
    righe = []
    for (regola, impatto, aiuto), occorrenze in sorted(trovate.items()):
        righe.append(f'{impatto}: {regola} — {aiuto}')
        for schema, pagina, selettore in occorrenze[:12]:
            righe.append(f'  {schema}/{pagina}: {selettore}')
        rimanenti = len(occorrenze) - 12
        if rimanenti > 0:
            righe.append(f'  … altre {rimanenti} occorrenze')
    return '\n'.join(righe)


with chromium() as browser:
    trovate = defaultdict(list)
    for schema in ('light', 'dark'):
        page, errori = prepara(browser, schema)
        pagine = page.evaluate('prova.PAGINE.map(({id}) => id)')
        for pagina in pagine:
            page.evaluate('''id => {
              const corso = prova.stato.registro.corsi[0]
              if (!prova.stato.corsoId && corso) prova.scegliCorso(corso.id)
              prova.vaiA(prova.PAGINE.find(pagina => pagina.id === id))
            }''', pagina)
            page.evaluate(FRAME)
            page.wait_for_function('document.querySelector("main")?.textContent.length > 0')
            controlla(page, schema, pagina, trovate)
        assert not errori, f'errori JavaScript ({schema}): {errori}'
        page.close()

if trovate:
    raise AssertionError('Violazioni WCAG critical/serious:\n' + formato(trovate))
print('OK: axe-core, tutte le pagine, temi chiaro e scuro, nessuna violazione critical/serious')

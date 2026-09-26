"""Gate WCAG automatico dell'intera shell Regiclass con axe-core locale.

Costruire prima i bundle con ``node esbuild.mjs --ui``. Il test visita ogni
pagina dichiarata dall'app in entrambi gli schemi colore. Fallisce solo per
violazioni WCAG di impatto ``critical`` o ``serious``; stampa regola, pagina e
selettori, senza scaricare codice da CDN.
"""
from collections import defaultdict
from pathlib import Path
from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[2]
axe = root / 'node_modules/axe-core/axe.min.js'
if not axe.is_file():
    raise RuntimeError('axe-core non installato: eseguire npm install')

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
    page = browser.new_page(
        viewport={'width': 1440, 'height': 1000},
        color_scheme=schema,
        reduced_motion='reduce',
    )
    errori = []
    page.on('pageerror', lambda errore: errori.append(str(errore)))
    page.set_content(
        '<html lang="it"><head><title>Regiclass</title></head>'
        '<body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.add_script_tag(path=str(axe))
    page.wait_for_load_state('networkidle')
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


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
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
            page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
            page.wait_for_function('document.querySelector("main")?.textContent.length > 0')
            controlla(page, schema, pagina, trovate)
        assert not errori, f'errori JavaScript ({schema}): {errori}'
        page.close()
    browser.close()

if trovate:
    raise AssertionError('Violazioni WCAG critical/serious:\n' + formato(trovate))
print('OK: axe-core, tutte le pagine, temi chiaro e scuro, nessuna violazione critical/serious')

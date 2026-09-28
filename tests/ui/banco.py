"""Il banco delle prove dell'interfaccia: quel che ogni prova rifaceva uguale.

Il browser, la pagina con il pannello montato sui bundle di
`node esbuild.mjs --ui`, il ponte finto al posto di `acquireVsCodeApi`, la
cartella delle fotografie. Quel che cambia da prova a prova — i dati, i gesti,
le misure — resta nel suo file.

Non è una prova: `tools/uiTests.mjs` lo salta.
"""
from contextlib import contextmanager
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

RADICE = Path(__file__).resolve().parents[2]
BUNDLE = RADICE / 'dist-tests'
# Le fotografie stanno in una cartella loro, non mescolate ai bundle.
SCHERMATE = Path(os.environ.get('SCATTI', BUNDLE / 'schermate'))

PAGINA = '<html lang="it"><body class="app"><div id="radice"></div></body></html>'
# Con il titolo: axe vuole un documento che si chiami in qualche modo.
PAGINA_CON_TITOLO = ('<html lang="it"><head><title>Regiklass</title></head>'
                     '<body class="app"><div id="radice"></div></body></html>')

FRAME = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'
FOTOGRAMMA = '()=>new Promise(requestAnimationFrame)'

# La data di oggi come la calcola il registro: quella locale, non quella UTC.
OGGI = ("(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');"
        "return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()")

# L'ultima azione mandata di un tipo, o `null`.
ULTIMA = "(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).map(m=>m.azione).at(-1) ?? null"

RISPOSTA_OK = "{ tipo: 'risposta', id: m.id, ok: true }"


def ponte(risposta=RISPOSTA_OK, prima_di_rispondere=''):
    """Il finto `acquireVsCodeApi`: tiene quel che parte e risponde «fatto».

    - `richieste` e `tutte`: ogni messaggio mandato; le prove svuotano la prima,
      la seconda resta intera;
    - `ricordato`: l'ultimo `setState`, quel che il pannello ricorderebbe;
    - `inViaggio`: le richieste senza risposta, per aspettarle invece di dormire;
    - `trattieni = true` tiene ferme le risposte, `rilascia()` ne manda una.

    `risposta` è l'espressione JavaScript della risposta a `m`;
    `prima_di_rispondere` gira nel giro della risposta, prima di lei.
    """
    return f'''(() => {{
  window.richieste = []
  window.tutte = []
  window.ricordato = null
  window.inViaggio = 0
  window.trattieni = false
  window.trattenute = []
  const rispondi = (m) => {{
    window.dispatchEvent(new MessageEvent('message', {{ data: {risposta} }}))
    window.inViaggio -= 1
  }}
  window.rilascia = () => {{ const m = window.trattenute.shift(); if (m) rispondi(m) }}
  window.acquireVsCodeApi = () => ({{
    getState: () => null,
    setState: (s) => {{ window.ricordato = s }},
    postMessage: (m) => {{
      window.richieste.push(m)
      window.tutte.push(m)
      if (!m.id) return
      window.inViaggio += 1
      if (window.trattieni) {{ window.trattenute.push(m); return }}
      setTimeout(() => {{ {prima_di_rispondere}; rispondi(m) }}, 0)
    }},
  }})
}})()'''


@contextmanager
def chromium():
    """Chromium senza finestra, chiuso anche quando una prova cade."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            yield browser
        finally:
            browser.close()


def pannello(browser, larghezza=1440, altezza=1000, *, html=PAGINA, ponte_js=None,
             lingua=None, bundle='ui', prima=None, **opzioni):
    """Una pagina nuova con il pannello montato: torna la pagina e i suoi errori JS.

    `lingua` arriva come in Electron, `window.registroLingua` prima di ogni
    modulo; `prima(page)` gira prima del contenuto (orologio, rotte, console);
    `bundle` sceglie la coppia `.css`/`.js` di `dist-tests/`; il resto va a
    `new_page` (`color_scheme`, `reduced_motion`, …).
    """
    page = browser.new_page(viewport={'width': larghezza, 'height': altezza}, **opzioni)
    errori = []
    page.on('pageerror', lambda e: errori.append(str(e)))
    if prima:
        prima(page)
    page.set_content(html)
    if lingua:
        page.add_script_tag(content=f"window.registroLingua = '{lingua}'")
    page.add_script_tag(content=ponte_js or ponte())
    page.add_style_tag(path=str(BUNDLE / f'{bundle}.css'))
    page.add_script_tag(path=str(BUNDLE / f'{bundle}.js'))
    page.wait_for_load_state('networkidle')
    return page, errori


def attendi_risposte(page):
    """Aspetta che ogni richiesta mandata abbia avuto la sua risposta."""
    page.wait_for_function('() => window.inViaggio === 0')


def schermata(chi, nome, **opzioni):
    """Fotografa una pagina o un elemento in `dist-tests/schermate/` (o in `SCATTI`)."""
    SCHERMATE.mkdir(parents=True, exist_ok=True)
    chi.screenshot(path=str(SCHERMATE / nome), **opzioni)


def esegui(nome, prove):
    """Lancia prove indipendenti su un browser solo; le raccoglie tutte, poi esce."""
    fallite = []
    with chromium() as browser:
        for prova in prove:
            try:
                prova(browser)
                print(f'ok   {prova.__name__}')
            except Exception as errore:  # noqa: BLE001 — si raccolgono tutte, poi si esce
                fallite.append(prova.__name__)
                print(f'NO   {prova.__name__}: {errore}')
    if fallite:
        raise SystemExit(f'fallite: {", ".join(fallite)}')
    print(f'{nome}: tutto verde')

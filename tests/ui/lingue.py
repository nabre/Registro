"""Il pannello nelle altre lingue: nessuna parola italiana rimasta sullo schermo.

Il controllo statico (`npm run i18n`) trova il testo scritto nel codice fuori
da un catalogo; questa prova guarda il risultato. Per ogni lingua che non è
l'italiano apre ogni pagina della barra laterale e legge il testo visibile:
una parola che esiste solo in italiano — «della», «questo», «più», «nessuna»
— vuol dire una frase che non è passata dal catalogo, o una traduzione
lasciata a metà.

Il registro di prova ha dati italiani — «Matematica», «Esercizi di DIC4a» —
e quelli restano come sono in ogni lingua: sono scritti dal docente. Le parole
cercate qui non compaiono in quei dati.

La lingua arriva alla pagina come in Electron: `window.registroLingua`, letta
da `src/i18n/page.ts` prima di ogni altro modulo.

Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/lingue.py`
"""
from pathlib import Path
import os
import re
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
scatti = Path(os.environ.get('SCATTI', root / 'dist-tests'))
scatti.mkdir(parents=True, exist_ok=True)

PONTE = '''
window.acquireVsCodeApi = () => ({
  getState: () => null, setState: () => {},
  postMessage: (m) => {
    if (m.id) setTimeout(() => window.dispatchEvent(new MessageEvent('message',
      { data: { tipo: 'risposta', id: m.id, ok: true } })), 0)
  },
})
'''

FRAME = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'

# Parole che in tedesco, francese e inglese non esistono (preposizioni
# articolate, avverbi comuni). Una parola attaccata a un punto o a una barra è
# un nome di file o di procedura (`impostazioni.json`, `corsi.elenco`), che si
# cita com'è.
SOLO_ITALIANO = re.compile(
    r"(?<![./])\b(della|delle|dello|degli|nella|nelle|negli|sulla|sulle|questo|questa|"
    r"sono|anche|perché|più|già|nessuna|nessun|ancora|oppure|quando|dove|"
    r"lezione|lezioni|classi|corsi|impostazioni|aggiungi|salva|chiudi|elimina)\b(?![./]\w)",
    re.IGNORECASE,
)

errori_totali = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for lingua in ['de', 'fr', 'en']:
        page = browser.new_page(viewport={'width': 1400, 'height': 1000})
        errori = []
        page.on('pageerror', lambda e: errori.append(str(e)))
        page.set_content('<html><body class="app"><div id="radice"></div></body></html>')
        page.add_script_tag(content=f"window.registroLingua = '{lingua}'")
        page.add_script_tag(content=PONTE)
        page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
        page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
        page.wait_for_load_state('networkidle')
        assert page.evaluate('document.documentElement.lang') == lingua

        ids = page.evaluate('prova.PAGINE.map(p=>p.id)')
        for pagina in ids:
            page.evaluate("id=>prova.vaiA(prova.PAGINE.find(p=>p.id===id))", pagina)
            page.evaluate(FRAME)
            testo = page.evaluate('document.body.innerText')
            for riga in testo.split('\n'):
                trovata = SOLO_ITALIANO.search(riga)
                if trovata:
                    riga = riga.strip()[:100]
                    errori_totali.append(f'{lingua} {pagina}: «{trovata.group(0)}» in «{riga}»')
            if pagina == 'pagina.calendario':
                page.screenshot(path=str(scatti / f'lingua-{lingua}.png'))

        assert not errori, errori
        page.close()
    browser.close()

if errori_totali:
    print('\n'.join(sorted(set(errori_totali))))
    raise SystemExit(f'{len(set(errori_totali))} righe con parole italiane')
print('lingue: nessuna parola italiana nel pannello in tedesco, francese e inglese')

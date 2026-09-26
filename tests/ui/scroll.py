"""Lo scorrimento: chi ricorda dov'era, chi riparte dall'alto, chi segue il fondo.

Sta in un file suo e non dentro `navigation.py` perché è una cosa sola e la si
legge tutta insieme: `navigation.py` sono novecento righe di navigazione,
comandi e filtri, e una regressione dello scorrimento vi si perderebbe in mezzo.

Che cosa difende, e da che cosa. Il registro **rifà l'albero intero a ogni
cambio di stato** — una spunta, l'orologio che batte il minuto, una lettera
scritta in un filtro — e `rimpiazza` in `ui/dom.ts` svuota e ricostruisce: ogni
scatola che scorre riparte da capo, salvo quelle marcate `data-scorrimento`.
`main.contenuto`, che è la superficie su cui scorre quasi ogni pagina del
registro, non era marcata: chi si era scorso in fondo alle pendenze tornava in
cima a ogni gesto. Queste prove sarebbero state rosse prima di quel marchio.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/scroll.py`
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Bassa apposta: su una finestra alta la Guida non scorre.
    page = browser.new_page(viewport={'width': 1280, 'height': 600})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.tutte=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); tutte.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')

    contenuto = page.locator('main.contenuto')

    # La pagina dichiara che cosa si sta guardando: è la chiave con cui
    # `ricordaScorrimenti` la ritrova dopo il ridisegno.
    chiave = contenuto.get_attribute('data-scorrimento')
    assert chiave and chiave.startswith('pagina:'), f'chiave assente o storta: {chiave!r}'

    # Una pagina lunga, scorsa a metà, sopravvive a un ridisegno che non cambia
    # niente (si spunta una riga e la pagina si rifà).
    page.evaluate("prova.aggiorna({vista:'guida'})")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    contenuto.evaluate('(el) => el.scrollTop = 400')
    dove = contenuto.evaluate('(el) => el.scrollTop')
    assert dove > 0, 'la Guida non scorre: la prova non direbbe niente'
    page.evaluate('prova.aggiorna({})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert contenuto.evaluate('(el) => el.scrollTop') == dove, 'la pagina è tornata in cima'

    # Cambiando vista si riparte dall'alto: è un'altra cosa che si guarda.
    page.evaluate("prova.aggiorna({vista:'impostazioni'})")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert contenuto.evaluate('(el) => el.scrollTop') == 0, 'la vista nuova eredita lo scorrimento della precedente'

    # La regola unica di `styles/foundations.css` arriva sulla scatola: il gesto
    # si ferma in fondo, lo spazio della barra è riservato, la barra è sottile.
    stile = contenuto.evaluate(
        "(el) => { const s = getComputedStyle(el);"
        " return [s.overscrollBehaviorY, s.scrollbarGutter, s.scrollbarWidth].join('|') }"
    )
    assert 'contain' in stile, f'manca `overscroll-behavior: contain`: {stile}'
    assert 'stable' in stile, f'manca `scrollbar-gutter: stable`: {stile}'
    assert 'thin' in stile, f'manca `scrollbar-width: thin`: {stile}'

    assert not errors, f'errori JS: {errors}'
    browser.close()

print('scorrimento: ok')

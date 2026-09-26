"""Il movimento fra le pagine: indietro e avanti, Ctrl+1…9, l'entrata.

Che cosa difende, e da che cosa.

- **Indietro e avanti** (`ui/history.ts`): Alt+← torna alla pagina di prima
  *con lo scorrimento di prima*, Alt+→ rifà il passo; i due tasti laterali del
  mouse fanno lo stesso. Il ripristino vale solo per questi due gesti: aprire
  una pagina in ogni altro modo la mostra dall'alto (`scroll.py`), e questa
  prova lo ricontrolla dopo un giro nella fila. Un passo nella fila non mette
  in fila niente: tornare indietro due volte deve arrivare due pagine indietro,
  non rimbalzare fra le ultime due.
- **Ctrl+cifra** (`ui/shortcuts.ts`): la seconda voce della barra laterale si
  apre con Ctrl+2, anche dal tasto fisico del tastierino; la quinta con Ctrl+5.
- **L'entrata** (`ui/main.ts`, `styles/motion.css`): `data-entrata` c'è nel
  disegno in cui la pagina cambia e non in quello di un `aggiorna` qualunque
  dopo — che è il giro dell'orologio. Se restasse, la pagina lampeggerebbe a
  ogni minuto.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/movimento.py`
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Bassa apposta, come in `scroll.py`: la Guida deve scorrere.
    page = browser.new_page(viewport={'width': 1280, 'height': 600})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.tutte=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); tutte.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')

    contenuto = page.locator('main.contenuto')

    def fotogramma():
        page.evaluate('()=>new Promise(requestAnimationFrame)')

    def vista():
        return page.evaluate('prova.stato.vista')

    def fuori_dai_campi():
        # Le frecce con Alt dentro un campo sono di chi scrive: il fuoco va
        # lasciato sul corpo della pagina, come dopo un clic su una riga.
        page.evaluate('document.activeElement && document.activeElement.blur()')

    # Tre pagine di fila: il calendario, la Guida scorsa a metà, le Impostazioni.
    page.evaluate("prova.aggiorna({vista:'calendario'})")
    fotogramma()
    page.evaluate("prova.aggiorna({vista:'guida'})")
    fotogramma()
    contenuto.evaluate('(el) => el.scrollTop = 400')
    scorsa = contenuto.evaluate('(el) => el.scrollTop')
    assert scorsa > 0, 'la Guida non scorre: la prova non direbbe niente'
    page.evaluate("prova.aggiorna({vista:'impostazioni'})")
    fotogramma()
    assert contenuto.evaluate('(el) => el.scrollTop') == 0, 'aprire una pagina deve mostrarla dall’alto'

    # Alt+←: la Guida, al punto a cui era arrivata.
    fuori_dai_campi()
    page.keyboard.press('Alt+ArrowLeft')
    fotogramma()
    assert vista() == 'guida', f'Alt+← doveva tornare alla Guida, siamo su {vista()!r}'
    assert contenuto.evaluate('(el) => el.scrollTop') == scorsa, 'tornando indietro la Guida è ripartita dall’alto'

    # Ancora Alt+←: il calendario. Il passo di prima non si è messo in fila.
    fuori_dai_campi()
    page.keyboard.press('Alt+ArrowLeft')
    fotogramma()
    assert vista() == 'calendario', f'due passi indietro dovevano arrivare al calendario: {vista()!r}'

    # Alt+→ due volte: la Guida, ancora scorsa, e poi le Impostazioni.
    fuori_dai_campi()
    page.keyboard.press('Alt+ArrowRight')
    fotogramma()
    assert vista() == 'guida', f'Alt+→ doveva tornare alla Guida: {vista()!r}'
    assert contenuto.evaluate('(el) => el.scrollTop') == scorsa, 'andando avanti la Guida è ripartita dall’alto'
    fuori_dai_campi()
    page.keyboard.press('Alt+ArrowRight')
    fotogramma()
    assert vista() == 'impostazioni', f'Alt+→ doveva arrivare alle Impostazioni: {vista()!r}'
    # In fondo alla fila Alt+→ non fa niente.
    fuori_dai_campi()
    page.keyboard.press('Alt+ArrowRight')
    fotogramma()
    assert vista() == 'impostazioni'

    # I tasti laterali del mouse: il quarto indietro, il quinto avanti.
    page.evaluate("document.body.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}))")
    fotogramma()
    assert vista() == 'guida', f'il tasto «indietro» del mouse doveva tornare alla Guida: {vista()!r}'
    page.evaluate("document.body.dispatchEvent(new MouseEvent('mouseup',{button:4,bubbles:true,cancelable:true}))")
    fotogramma()
    assert vista() == 'impostazioni', f'il tasto «avanti» del mouse doveva tornare alle Impostazioni: {vista()!r}'

    # Da un posto raggiunto con «indietro», una pagina nuova taglia via quel che
    # stava avanti: Alt+→ non riporta più alle Impostazioni.
    fuori_dai_campi()
    page.keyboard.press('Alt+ArrowLeft')
    fotogramma()
    page.evaluate("prova.aggiorna({vista:'corsi'})")
    fotogramma()
    assert contenuto.evaluate('(el) => el.scrollTop') == 0, 'una pagina aperta a mano ha ereditato uno scorrimento'
    fuori_dai_campi()
    page.keyboard.press('Alt+ArrowRight')
    fotogramma()
    assert vista() == 'corsi', 'dopo una pagina nuova non c’è più niente «avanti»'

    # Dentro un campo di testo Alt+← è di chi scrive.
    campo = page.locator('input[type="text"], input:not([type]), textarea').first
    if campo.count():
        campo.focus()
        page.keyboard.press('Alt+ArrowLeft')
        fotogramma()
        assert vista() == 'corsi', 'Alt+← dentro un campo ha portato via la pagina'

    # Ctrl+cifra: le voci come si vedono nella barra laterale, gruppo dopo gruppo,
    # non l'ordine di `PAGINE`. Ctrl+5 le separa: la quinta visibile è la prima del
    # registro, la quinta di `PAGINE` è dell'anno.
    VISIBILI = 'prova.gruppiDiPagine().flatMap(g=>g.pagine)'
    assert page.evaluate(f'{VISIBILI}[4].id') != page.evaluate('prova.PAGINE[4].id'),         'la prova non distingue più i due ordini: sceglierne un altro'
    fuori_dai_campi()
    for tasto, posto in [('Control+2', 1), ('Control+1', 0), ('Control+5', 4), ('Control+Numpad2', 1)]:
        attesa = page.evaluate(f'{VISIBILI}[{posto}].id')
        page.keyboard.press(tasto)
        fotogramma()
        assert page.evaluate(f'{VISIBILI}[{posto}].attiva()'), f'{tasto} non ha aperto {attesa}'

    # L'entrata c'è nel disegno del cambio di pagina, non in un aggiornamento
    # arrivato dopo.
    page.evaluate("prova.aggiorna({vista:'guida'})")
    fotogramma()
    assert contenuto.get_attribute('data-entrata') is not None, 'cambiando pagina manca data-entrata'
    animazione = page.locator('main.contenuto > .vista').evaluate('(el) => getComputedStyle(el).animationName')
    assert animazione == 'entrata-pagina', f'la vista non si anima entrando: {animazione!r}'
    page.wait_for_timeout(300)
    page.evaluate('prova.aggiorna({})')
    fotogramma()
    assert contenuto.get_attribute('data-entrata') is None, 'data-entrata resta anche senza cambio di pagina'
    # Ferma, la vista non ha trasformazioni: i menu `position: fixed` là dentro la
    # prenderebbero come riferimento.
    assert page.locator('main.contenuto > .vista').evaluate('(el) => getComputedStyle(el).transform') == 'none'

    # Chi ha chiesto meno movimento: l'attributo può esserci, l'animazione no.
    page.emulate_media(reduced_motion='reduce')
    page.evaluate("prova.aggiorna({vista:'impostazioni'})")
    fotogramma()
    animazione = page.locator('main.contenuto > .vista').evaluate('(el) => getComputedStyle(el).animationName')
    assert animazione == 'none', f'con «riduci movimento» la pagina si anima lo stesso: {animazione!r}'

    assert not errors, f'errori JS: {errors}'
    browser.close()

print('movimento: ok')

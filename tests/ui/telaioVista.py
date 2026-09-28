"""La radice della vista resta fra due disegni, e una pagina letta non rifà la pagina.

La catena di `data-telaio` (`ui/pannello/dom.ts`) tiene un nodo fra due
disegni solo se tutti i suoi antenati sono tenuti: guscio, `main.contenuto`,
e la radice della vista, che `shell.ts` segna da sé per ogni vista. Senza
l'ultimo anello ogni scatola che scorre dentro una vista era nuova a ogni
gesto. Qui si fissa che la radice è lo stesso nodo dopo un ridisegno in ogni
pagina, che cambiando pagina è nuova, e che il messaggio `lavoro` (la lettura
delle scansioni, a ogni pagina) cambia lo stato senza rifare la vista quando
le isole che lo mostrano ci sono.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/telaioVista.py`
"""
from banco import FOTOGRAMMA, esegui, pannello

RADICE = "() => document.querySelector('main.contenuto')?.lastElementChild ?? null"

# Un ridisegno completo che non cambia pagina: un cambio vero dello stato.
RIDISEGNO = '() => prova.aggiorna({ azioniNascoste: !prova.stato.azioniNascoste })'


def radice_resta_in_ogni_pagina(browser):
    page, errori = pannello(browser)
    ids = page.evaluate('() => prova.gruppiDiPagine().flatMap((g) => g.pagine.map((p) => p.id))')
    assert len(ids) > 5, f'poche pagine: la prova non direbbe niente ({ids})'
    for pagina in ids:
        page.evaluate('(id) => prova.vaiA(prova.PAGINE.find((p) => p.id === id))', pagina)
        page.evaluate(FOTOGRAMMA)
        chiave = page.evaluate(f'() => ({RADICE})()?.dataset.telaio ?? null')
        assert chiave, f'{pagina}: la radice della vista non è nel telaio'
        page.evaluate(f'() => {{ window.__radice = ({RADICE})() }}')
        page.evaluate(RIDISEGNO)
        page.evaluate(FOTOGRAMMA)
        assert page.evaluate(f'() => ({RADICE})() === window.__radice'), \
            f'{pagina}: la radice della vista è un nodo nuovo dopo il ridisegno'
    assert not errori, f'errori JS: {errori}'
    page.close()


def cambiando_pagina_la_radice_e_nuova(browser):
    page, errori = pannello(browser)
    page.evaluate("() => prova.vai({ pagina: 'pagina.classi' })")
    page.evaluate(FOTOGRAMMA)
    page.evaluate(f'() => {{ window.__radice = ({RADICE})() }}')
    page.evaluate("() => prova.vai({ pagina: 'pagina.persone' })")
    page.evaluate(FOTOGRAMMA)
    assert page.evaluate(f'() => ({RADICE})() !== window.__radice'), \
        'cambiando pagina la radice di prima è rimasta'
    # La chiave è `vista:<vista>`, o quella che la vista si è data.
    assert page.evaluate(f'() => ({RADICE})().dataset.telaio'), 'la radice nuova non è nel telaio'
    assert not errori, f'errori JS: {errori}'
    page.close()


def lavoro(fatte, coda):
    """Il messaggio dell'host a ogni pagina letta, con lo stesso PDF in coda."""
    voci = ', '.join(f"{{ smistamentoId: 'pdf-1', pagina: {n}, etichetta: 'prova.pdf' }}" for n in coda)
    return f'''() => window.dispatchEvent(new MessageEvent('message', {{ data: {{
  tipo: 'lavoro',
  corrente: {{ smistamentoId: 'pdf-1', pagina: {fatte + 1}, etichetta: 'prova.pdf' }},
  fatte: {fatte}, totale: 4, coda: [{voci}],
}} }}))'''


def una_pagina_letta_non_rifa_la_vista(browser):
    page, errori = pannello(browser)
    page.evaluate("() => prova.vai({ pagina: 'pagina.classi' })")
    page.evaluate(FOTOGRAMMA)
    # Il PDF entra nella lettura: i suoi comandi cambiano, si rifà tutto.
    page.evaluate(lavoro(0, [2, 3]))
    page.evaluate(FOTOGRAMMA)
    assert page.evaluate('() => prova.stato.lavoro.fatte') == 0
    # Un nodo della vista fuori dal telaio: un ridisegno completo lo rifarebbe.
    page.evaluate(f'() => {{ window.__testata = ({RADICE})().firstElementChild }}')
    page.evaluate(lavoro(1, [3]))
    page.evaluate(FOTOGRAMMA)
    assert page.evaluate('() => prova.stato.lavoro.fatte') == 1, 'lo stato non segue la lettura'
    isole = page.evaluate(
        "() => ['coda-lettura', 'barra-stato'].filter((k) => document.querySelector(`[data-isola=\"${k}\"]`))")
    stessa = page.evaluate(f'() => ({RADICE})().firstElementChild === window.__testata')
    if isole:
        assert stessa, f'una pagina letta ha rifatto la vista, con le isole {isole} in pagina'
    else:
        # Nessuna isola che la mostri: il ridisegno completo è il ripiego.
        assert not stessa, 'senza isole la lettura non si vede da nessuna parte'
    assert not errori, f'errori JS: {errori}'
    page.close()


esegui('telaioVista', [
    radice_resta_in_ogni_pagina,
    cambiando_pagina_la_radice_e_nuova,
    una_pagina_letta_non_rifa_la_vista,
])

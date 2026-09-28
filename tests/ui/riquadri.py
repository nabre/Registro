"""I riquadri che non si rifanno: la mappa, la mappa piccola, la striscia del mese.

Il registro ridisegna tutto a ogni cambio di stato. Un riquadro ricreato a
ogni disegno perde quel che chi guarda ha fatto con le mani: la mappa tornava
all'inquadratura automatica e ricaricava i tasselli, la mappa piccola della
scheda perdeva spostamento e ingrandimento, la striscia del mese perdeva lo
scorrimento in corsa. Qui si guarda che dopo un ridisegno il nodo sia lo stesso
e che la mano non sia stata disfatta. Prima della correzione erano rosse.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/riquadri.py`
"""
from banco import FRAME, esegui, pannello

# Un indirizzo di casa collocato per la prima allieva: la mappa ha un punto
# oltre alla sede, e la scheda la sua mappa piccola.
CON_UN_INDIRIZZO = r'''() => {
  const registro = structuredClone(prova.stato.registro)
  const allieva = registro.classi[0].allievi[0]
  allieva.indirizzo = { via: 'Via Cantonale 1', cap: '6900', localita: 'Lugano' }
  registro.coordinate.push({
    chiave: 'via cantonale 1, 6900 lugano',
    indirizzo: 'Via Cantonale 1, 6900 Lugano',
    lat: 46.0037, lon: 8.9511, trovatoIl: '2026-09-01T08:00:00.000Z',
  })
  prova.aggiorna({ registro })
  return { classeId: registro.classi[0].id, allievoId: allieva.id }
}'''

# Quel che la mano cambia nella mappa: dove sono i tasselli e che scala segna.
VEDUTA = r'''(tela) => ({
  tasselli: [...tela.querySelectorAll('.mappa__tassello')].map((t) => t.dataset.tassello).sort(),
  scala: tela.querySelector('.mappa__scala').textContent,
})'''


def ridisegna(page):
    page.evaluate('prova.ridisegna()')
    page.evaluate(FRAME)


def rotella_sulla(page, selettore):
    """Ingrandisce con la rotella sopra il riquadro: l'inquadratura non è più quella automatica."""
    riquadro = page.locator(selettore).bounding_box()
    page.mouse.move(riquadro['x'] + riquadro['width'] / 3, riquadro['y'] + riquadro['height'] / 3)
    page.mouse.wheel(0, -120)
    page.evaluate(FRAME)


def la_mappa_resta(browser):
    page, errori = pannello(browser, 1280, 800)
    page.evaluate(CON_UN_INDIRIZZO)
    page.evaluate("prova.vai({ pagina: 'pagina.mappa' })")
    page.evaluate(FRAME)
    tela = page.locator('.mappa__corpo .mappa__tela')
    tela.wait_for()
    page.evaluate("window.__tela = document.querySelector('.mappa__corpo .mappa__tela')")
    prima = tela.evaluate(VEDUTA)
    rotella_sulla(page, '.mappa__corpo .mappa__tela')
    mossa = tela.evaluate(VEDUTA)
    assert mossa != prima, 'la rotella non ha cambiato la mappa: la prova non direbbe niente'
    page.evaluate("window.__tassello = document.querySelector('.mappa__tassello')")

    ridisegna(page)
    assert page.evaluate(
        "document.querySelector('.mappa__corpo .mappa__tela') === window.__tela"
    ), 'il ridisegno ha rifatto il riquadro della mappa'
    assert page.evaluate(
        "window.__tassello.isConnected"
    ), 'il ridisegno ha rifatto i tasselli'
    assert tela.evaluate(VEDUTA) == mossa, 'il ridisegno ha rimesso l\'inquadratura automatica'
    # Un'altra pagina e ritorno: il riquadro è ancora lui, e guarda dove guardava.
    page.evaluate("prova.vai({ pagina: 'pagina.oggi' })")
    page.evaluate(FRAME)
    page.evaluate("prova.vai({ pagina: 'pagina.mappa' })")
    page.evaluate(FRAME)
    tela.wait_for()
    assert tela.evaluate(VEDUTA) == mossa, 'tornando sulla mappa l\'inquadratura è ripartita'
    assert not errori, errori


def la_mappa_piccola_resta(browser):
    page, errori = pannello(browser, 1280, 900)
    ids = page.evaluate(CON_UN_INDIRIZZO)
    page.evaluate(
        "(ids) => prova.vai({ pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: ids.allievoId } },"
        " { contesto: { classeId: ids.classeId } })",
        ids,
    )
    page.evaluate(FRAME)
    selettore = '.dove-sta__tela .mappa__tela'
    tela = page.locator(selettore)
    tela.wait_for()
    tela.scroll_into_view_if_needed()
    page.evaluate(f"window.__piccola = document.querySelector('{selettore}')")
    prima = tela.evaluate(VEDUTA)
    rotella_sulla(page, selettore)
    mossa = tela.evaluate(VEDUTA)
    assert mossa != prima, 'la rotella non ha cambiato la mappa piccola: la prova non direbbe niente'

    ridisegna(page)
    assert page.evaluate(
        f"document.querySelector('{selettore}') === window.__piccola"
    ), 'il ridisegno ha rifatto la mappa piccola'
    assert tela.evaluate(VEDUTA) == mossa, 'il ridisegno ha perso spostamento e ingrandimento'
    assert not errori, errori


def il_mese_non_torna_indietro(browser):
    page, errori = pannello(browser, 1280, 700)
    page.evaluate("prova.vai({ pagina: 'pagina.calendario' }, { preferenze: {} })")
    page.evaluate("prova.aggiorna({ modoCalendario: 'mese' })")
    page.evaluate(FRAME)
    striscia = page.locator('.mese__scorrevole')
    striscia.wait_for()
    page.evaluate(FRAME)
    page.evaluate("window.__striscia = document.querySelector('.mese__scorrevole')")

    # La striscia portata sul giorno scelto, a disegno fatto.
    assert page.evaluate(r'''() => {
      const s = document.querySelector('.mese__scorrevole').getBoundingClientRect()
      const c = document.querySelector('.mese__cella--scelta').getBoundingClientRect()
      return c.top >= s.top && c.bottom <= s.bottom
    }'''), 'il giorno scelto non si vede nella striscia'

    # Uno scorrimento dolce in corso, e intanto il registro si ridisegna: la
    # striscia arriva dove andava. Ricreata, si fermava a metà strada.
    partenza = striscia.evaluate('(el) => el.scrollTop')
    striscia.evaluate("(el) => el.scrollBy({ top: 500, behavior: 'smooth' })")
    page.evaluate('window.__ridisegni = setInterval(() => prova.ridisegna(), 30)')
    page.wait_for_timeout(700)
    page.evaluate('clearInterval(window.__ridisegni)')
    page.evaluate(FRAME)
    arrivo = striscia.evaluate('(el) => el.scrollTop')
    assert abs(arrivo - (partenza + 500)) <= 2, \
        f'lo scorrimento si è perso nei ridisegni: da {partenza} a {arrivo}, voleva {partenza + 500}'
    assert page.evaluate(
        "document.querySelector('.mese__scorrevole') === window.__striscia"
    ), 'il ridisegno ha rifatto la striscia del mese'

    # Fermo, un ridisegno non riporta lo scorrimento da nessuna parte.
    ridisegna(page)
    page.evaluate(FRAME)
    assert striscia.evaluate('(el) => el.scrollTop') == arrivo, 'un ridisegno ha mosso la striscia'

    # Un altro giorno lontano: striscia nuova, portata su di lui.
    page.evaluate("prova.aggiorna({ data: '2027-02-15' })")
    page.evaluate(FRAME)
    page.evaluate(FRAME)
    assert page.evaluate(r'''() => {
      const s = document.querySelector('.mese__scorrevole').getBoundingClientRect()
      const c = document.querySelector('.mese__cella--scelta').getBoundingClientRect()
      return c.top >= s.top && c.bottom <= s.bottom
    }'''), 'cambiando giorno la striscia non si è portata sul giorno nuovo'
    assert not errori, errori


esegui('riquadri', [la_mappa_resta, la_mappa_piccola_resta, il_mese_non_torna_indietro])

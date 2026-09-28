"""Pagina Documenti: ogni aggiornamento resta nel suo riquadro (ADR-48).

Si fissa che:

- dopo un ridisegno completo e dopo «Aggiorna tutto» a contenuto uguale
  (l'inventario torna con gli stessi percorsi, misure e revisioni) il lettore
  dell'anteprima è lo stesso `<iframe>` e il suo `src` non cambia: il PDF non
  ricarica e non torna a pagina uno;
- un foglio riscritto davvero (revisione nuova) ricarica;
- la barra dei riquadri è telaio: una spunta o un ridisegno non la ricreano,
  quindi il gesto di scorrimento in corsa non si perde; la spunta tiene il fuoco.

Esecuzione: `node esbuild.mjs --ui` e poi `python tests/ui/documentiRiquadri.py`.
"""
from banco import FRAME, esegui, pannello

PREPARA = """() => {
  const r = prova.stato.registro
  const c = r.corsi[0]
  const percorso = (genere, estensione) => {
    const d = prova.collocazioneDi(r, genere, c.id, { semestreId: null })
    return prova.percorsoDi(d, estensione)
  }
  const pdf = percorso('corso', 'pdf')
  const esportati = [
    { percorso: pdf, misura: 1000, revisione: 0 },
    { percorso: percorso('presenze', 'csv'), misura: 10, revisione: 0 },
  ]
  prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.corso.documenti'))
  prova.aggiorna({ schedaDocumenti: 'corso', semestreId: null, esportati,
    documentiScelti: [], anteprima: pdf, radiceDati: 'https://esempio.invalido/dati' })
  return pdf
}"""

# Segna i nodi con una proprietà JS: un nodo ricreato non la porta.
SEGNA = """() => {
  const telaio = document.querySelector('iframe')
  const barra = document.querySelector('.documenti__barra')
  telaio.__segnato = true
  barra.__segnata = true
  return telaio.getAttribute('src')
}"""

STESSO_TELAIO = """() => {
  const telaio = document.querySelector('iframe')
  return { stesso: telaio?.__segnato === true, src: telaio?.getAttribute('src'),
           quanti: document.querySelectorAll('iframe').length }
}"""

STESSA_BARRA = "() => document.querySelector('.documenti__barra')?.__segnata === true"


def cornice_tenuta(browser):
    page, errori = pannello(browser)
    page.evaluate(PREPARA)
    page.evaluate(FRAME)
    src = page.evaluate(SEGNA)
    assert src, 'nessun lettore nell\'anteprima'

    # Il segnaposto del disegno nuovo non entra mai nel documento: se entrasse,
    # ogni ridisegno chiederebbe di nuovo la sorgente del PDF.
    indirizzo = page.evaluate("() => document.querySelector('iframe').src")
    richieste = []
    page.on('request', lambda r: richieste.append(r.url) if r.url == indirizzo else None)
    for _ in range(5):
        page.evaluate('prova.ridisegna()')
        page.evaluate(FRAME)
    assert richieste == [], richieste

    # Ridisegno completo senza cambiare niente.
    page.evaluate('prova.ridisegna()')
    page.evaluate(FRAME)
    dopo = page.evaluate(STESSO_TELAIO)
    assert dopo['stesso'], dopo
    assert dopo['src'] == src, dopo
    assert dopo['quanti'] == 1, dopo
    assert page.evaluate(STESSA_BARRA), 'la barra dei riquadri è stata ricreata'

    # «Aggiorna tutto» a contenuto uguale: l'host rispinge l'inventario, oggetti
    # nuovi con gli stessi valori.
    page.evaluate('prova.aggiorna({ esportati: prova.stato.esportati.map((e) => ({ ...e })) })')
    page.evaluate(FRAME)
    dopo = page.evaluate(STESSO_TELAIO)
    assert dopo['stesso'], dopo
    assert dopo['src'] == src, dopo
    assert page.evaluate(STESSA_BARRA), 'la barra dei riquadri è stata ricreata'

    # Il foglio riscritto davvero ricarica: revisione nuova, indirizzo nuovo.
    page.evaluate('prova.aggiorna({ esportati: prova.stato.esportati.map((e) => ({ ...e, revisione: e.revisione + 1 })) })')
    page.evaluate(FRAME)
    dopo = page.evaluate(STESSO_TELAIO)
    assert dopo['src'] != src, dopo
    assert dopo['quanti'] == 1, dopo
    assert errori == [], errori


def spunta_senza_perdere_la_barra(browser):
    page, errori = pannello(browser)
    page.evaluate(PREPARA)
    page.evaluate(FRAME)
    page.evaluate(SEGNA)
    spunta = page.locator('.documenti__riga .documenti__spunta:not(.documenti__spunta--vuota)').first
    spunta.focus()
    page.keyboard.press('Space')
    page.evaluate(FRAME)
    assert len(page.evaluate('prova.stato.documentiScelti')) == 1
    assert page.evaluate(STESSA_BARRA), 'una spunta ha ricreato la barra dei riquadri'
    assert page.evaluate(STESSO_TELAIO)['stesso'], 'una spunta ha ricaricato l\'anteprima'
    # Il fuoco resta sulla casella appena premuta: si spunta di fila da tastiera.
    assert page.evaluate(
        "() => document.activeElement?.classList.contains('documenti__spunta')"), \
        page.evaluate('() => document.activeElement?.outerHTML')
    assert errori == [], errori


esegui('documentiRiquadri', [cornice_tenuta, spunta_senza_perdere_la_barra])

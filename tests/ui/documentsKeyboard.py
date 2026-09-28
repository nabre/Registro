"""Apertura dei documenti da tastiera, nelle righe.

Esecuzione: `node esbuild.mjs --ui` e poi
`python tests/ui/documentsKeyboard.py`.
"""
from playwright.sync_api import expect

from banco import FRAME, chromium, pannello

with chromium() as browser:
    page, errors = pannello(browser)

    # Riga: il nome visibile e' un vero pulsante. Invio e Spazio aprono il PDF.
    percorso_riga = page.evaluate("""() => {
      const r = prova.stato.registro
      const c = r.corsi[0]
      const d = prova.collocazioneDi(r, 'corso', c.id, {semestreId: null})
      const percorso = prova.percorsoDi(d)
      prova.vai({pagina: 'pagina.corso.documenti', soggetto: {tipo: 'corso', id: c.id}}, {
        contesto: {filtroClasseId: c.classeId},
        altro: {schedaDocumenti: 'corso', semestreId: null,
          esportati: [{percorso, misura: 10, revisione: 0}], anteprima: null}})
      return percorso
    }""")
    page.evaluate(FRAME)
    apri_nome = page.locator('.documenti__riga--apribile .documenti__nome-apri').first
    expect(apri_nome).to_be_enabled()
    expect(apri_nome).to_have_accessible_name('Scheda del corso')
    apri_nome.press('Enter')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_riga)
    assert page.evaluate('prova.stato.anteprima') == percorso_riga
    page.evaluate('prova.aggiorna({anteprima: null})')
    page.wait_for_function('() => prova.stato.anteprima === null')
    page.evaluate(FRAME)
    apri_nome = page.locator('.documenti__riga--apribile .documenti__nome-apri').first
    apri_nome.press('Space')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_riga)
    assert page.evaluate('prova.stato.anteprima') == percorso_riga

    # Lente: il pulsante dedicato riceve entrambi i tasti.
    page.evaluate('prova.aggiorna({anteprima: null})')
    page.wait_for_function('() => prova.stato.anteprima === null')
    page.evaluate(FRAME)
    apri_lente = page.locator('.documenti__riga--apribile .documenti__apri').first
    expect(apri_lente).to_be_enabled()
    expect(apri_lente).not_to_have_attribute('aria-label', '')
    apri_lente.press('Enter')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_riga)
    assert page.evaluate('prova.stato.anteprima') == percorso_riga
    page.evaluate('prova.aggiorna({anteprima: null})')
    page.wait_for_function('() => prova.stato.anteprima === null')
    page.evaluate(FRAME)
    apri_lente = page.locator('.documenti__riga--apribile .documenti__apri').first
    apri_lente.press('Space')
    page.wait_for_function('(percorso) => prova.stato.anteprima === percorso', arg=percorso_riga)
    assert page.evaluate('prova.stato.anteprima') == percorso_riga

    assert errors == [], errors

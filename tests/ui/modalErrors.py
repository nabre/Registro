"""Errori modali: riepilogo annunciato, descritto e focalizzato dopo submit."""
from playwright.sync_api import expect

from banco import FOTOGRAMMA, chromium, pannello, ponte

# `composizione.crea` risponde di no, come l'host con un nome già usato.
NOME_GIA_USATO = ("m.azione?.tipo === 'composizione.crea'"
                  " ? { tipo: 'risposta', id: m.id, ok: false, errori: ['Nome già usato'] }"
                  " : { tipo: 'risposta', id: m.id, ok: true }")

with chromium() as browser:
    page, errors = pannello(browser, ponte_js=ponte(risposta=NOME_GIA_USATO))

    # Due PDF selezionati rendono disponibile la modale Composizione.
    page.evaluate("""()=>{const r=prova.stato.registro, c=r.corsi[0];
      prova.vai({pagina:'pagina.corso.documenti',soggetto:{tipo:'corso',id:c.id}},{
        contesto:{filtroClasseId:c.classeId},
        altro:{schedaDocumenti:'corso',documentiScelti:['esportazioni/a.pdf','esportazioni/b.pdf'],
          esportati:[{percorso:'esportazioni/a.pdf',misura:10,revisione:0},
                     {percorso:'esportazioni/b.pdf',misura:10,revisione:0}],anteprima:null}})}""")
    page.evaluate(FOTOGRAMMA)
    page.locator('[data-fuoco="comando-documenti.combina"]').click()

    dialogo = page.get_by_role('dialog')
    riepilogo = dialogo.get_by_role('alert')
    expect(riepilogo).to_have_attribute('aria-live', 'assertive')
    expect(riepilogo).to_have_attribute('aria-atomic', 'true')
    expect(riepilogo).to_have_attribute('tabindex', '-1')
    assert dialogo.get_attribute('aria-describedby') == riepilogo.get_attribute('id')

    # Risposta negativa al submit: errore visibile e fuoco sul riepilogo.
    dialogo.get_by_role('textbox', name='Nome della composizione').fill('Duplicato')
    dialogo.get_by_role('button', name='Combina', exact=True).click()
    expect(riepilogo.locator('li')).to_have_count(1)
    expect(riepilogo).to_be_focused()
    assert riepilogo.inner_text().strip()
    # Nessuna aria-invalid inventata: errore non porta un identificatore di campo.
    expect(dialogo.locator('[aria-invalid="true"]')).to_have_count(0)

    assert not errors, errors

print('errori modali: ok')

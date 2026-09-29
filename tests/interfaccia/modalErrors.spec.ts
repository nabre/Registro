// Errori modali: riepilogo annunciato, descritto e focalizzato dopo submit.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, ponte, valuta } from './banco'

// `composizione.crea` risponde di no, come l'host con un nome già usato.
const NOME_GIA_USATO = "m.azione?.tipo === 'composizione.crea'" +
  " ? { tipo: 'risposta', id: m.id, ok: false, errori: ['Nome già usato'] }" +
  " : { tipo: 'risposta', id: m.id, ok: true }"

test('errori modali', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(NOME_GIA_USATO) })

  // Due PDF selezionati rendono disponibile la modale Composizione.
  await valuta(page, `()=>{const r=prova.stato.registro, c=r.corsi[0];
    prova.vai({pagina:'pagina.corso.documenti',soggetto:{tipo:'corso',id:c.id}},{
      contesto:{filtroClasseId:c.classeId},
      altro:{schedaDocumenti:'corso',documentiScelti:['esportazioni/a.pdf','esportazioni/b.pdf'],
        esportati:[{percorso:'esportazioni/a.pdf',misura:10,revisione:0},
                   {percorso:'esportazioni/b.pdf',misura:10,revisione:0}],anteprima:null}})}`)
  await valuta(page, FOTOGRAMMA)
  await page.locator('[data-fuoco="comando-documenti.combina"]').click()

  const dialogo = page.getByRole('dialog')
  const riepilogo = dialogo.getByRole('alert')
  await expect(riepilogo).toHaveAttribute('aria-live', 'assertive')
  await expect(riepilogo).toHaveAttribute('aria-atomic', 'true')
  await expect(riepilogo).toHaveAttribute('tabindex', '-1')
  expect(await dialogo.getAttribute('aria-describedby')).toBe(await riepilogo.getAttribute('id'))

  // Risposta negativa al submit: errore visibile e fuoco sul riepilogo.
  await dialogo.getByRole('textbox', { name: 'Nome della composizione' }).fill('Duplicato')
  await dialogo.getByRole('button', { name: 'Combina', exact: true }).click()
  await expect(riepilogo.locator('li')).toHaveCount(1)
  await expect(riepilogo).toBeFocused()
  expect((await riepilogo.innerText()).trim()).toBeTruthy()
  // Nessuna aria-invalid inventata: errore non porta un identificatore di campo.
  await expect(dialogo.locator('[aria-invalid="true"]')).toHaveCount(0)

  expect(errori).toEqual([])
})

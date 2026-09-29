// Errori modali: riepilogo annunciato, descritto e focalizzato dopo submit.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, ponte, valuta } from './banco'

// `classe.salva` risponde di no, come l'host con un nome già usato.
const NOME_GIA_USATO = "m.azione?.tipo === 'classe.salva'" +
  " ? { tipo: 'risposta', id: m.id, ok: false, errori: ['Nome già usato'] }" +
  " : { tipo: 'risposta', id: m.id, ok: true }"

test('errori modali', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(NOME_GIA_USATO) })

  // La modale della classe nuova: un campo di testo e un errore dall'host senza campo.
  await valuta(page, "()=>prova.COMANDI_UI.find(c=>c.id==='registro.nuovaClasse').al()")
  await valuta(page, FOTOGRAMMA)

  const dialogo = page.getByRole('dialog')
  const riepilogo = dialogo.getByRole('alert')
  await expect(riepilogo).toHaveAttribute('aria-live', 'assertive')
  await expect(riepilogo).toHaveAttribute('aria-atomic', 'true')
  await expect(riepilogo).toHaveAttribute('tabindex', '-1')
  expect(await dialogo.getAttribute('aria-describedby')).toBe(await riepilogo.getAttribute('id'))

  // Risposta negativa al submit: errore visibile e fuoco sul riepilogo.
  await dialogo.getByRole('textbox', { name: 'Nome della classe' }).fill('Duplicato')
  await dialogo.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(riepilogo.locator('li')).toHaveCount(1)
  await expect(riepilogo).toBeFocused()
  expect((await riepilogo.innerText()).trim()).toBeTruthy()
  // Nessuna aria-invalid inventata: errore non porta un identificatore di campo.
  await expect(dialogo.locator('[aria-invalid="true"]')).toHaveCount(0)

  expect(errori).toEqual([])
})

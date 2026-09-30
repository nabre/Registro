// Una modale in attesa di una risposta che non torna non resta aperta per
// sempre: Esc, «×» e Annulla chiudono anche da occupata, il clic fuori no, e la
// risposta arrivata dopo non fa più niente.

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta } from './banco'

/** Apre «Nuova classe», la compila e salva con le risposte trattenute. */
async function salvaSenzaRisposta (page: Page): Promise<void> {
  await valuta(page, "()=>prova.COMANDI_UI.find(c=>c.id==='registro.nuovaClasse').al()")
  await valuta(page, FOTOGRAMMA)
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('textbox', { name: 'Nome della classe' }).fill('Prima')
  await valuta(page, 'window.trattieni = true')
  await dialogo.getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(dialogo).toHaveClass(/modale--occupata/)
}

test('modale occupata', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const dialogo = page.getByRole('dialog')
  const successi = page.locator('.notifica--successo')

  // Esc chiude; il clic fuori, che parte anche per sbaglio, no.
  await salvaSenzaRisposta(page)
  await page.mouse.click(4, 4)
  await expect(dialogo).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)
  // La risposta tardiva non notifica e non riapre niente.
  await valuta(page, 'window.rilascia()')
  await valuta(page, FOTOGRAMMA)
  await expect(successi).toHaveCount(0)
  await expect(dialogo).toHaveCount(0)

  // La «×».
  await salvaSenzaRisposta(page)
  await dialogo.getByRole('button', { name: 'Chiudi', exact: true }).click()
  await expect(dialogo).toHaveCount(0)

  // Annulla.
  await salvaSenzaRisposta(page)
  await dialogo.getByRole('button', { name: 'Annulla', exact: true }).click()
  await expect(dialogo).toHaveCount(0)

  await valuta(page, 'window.trattieni = false; while (window.trattenute.length) window.rilascia()')
  await expect(successi).toHaveCount(0)
  expect(errori).toEqual([])
})

// «Questo file» è uscito dalle impostazioni: è il dialogo «Informazioni
// documento», dal menu «File» e da Ctrl+K. Gli indirizzi di prima portano
// sull'anno, e Calendario › Anno non ha più né il file né l'elenco degli anni.

import { expect, test } from '@playwright/test'

import { FRAME, pannello, valuta } from './banco'

test('informazioni_documento_dal_menu_file', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await page.locator('[data-fuoco="menu-File"]').click()
  await page.getByRole('menuitem', { name: /Informazioni documento/ }).click()
  const modale = page.locator('.modale')
  await expect(modale).toHaveCount(1)
  await expect(modale.getByRole('heading', { name: 'Informazioni documento' })).toBeVisible()
  // Quel che contiene: i conti del registro.
  await expect(modale.locator('.sintesi')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modale).toHaveCount(0)
  expect(errori).toEqual([])
  await page.close()
})

test('informazioni_documento_da_ctrl_k', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await page.locator('body').press('Control+k')
  const campo = page.locator('.palette__campo')
  await expect(campo).toBeFocused()
  await campo.fill('informazioni documento')
  await campo.press('Enter')
  await expect(page.locator('.modale').getByRole('heading', { name: 'Informazioni documento' }))
    .toBeVisible()
  expect(errori).toEqual([])
  await page.close()
})

test('anno_senza_file_ne_elenco_degli_anni', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  // Un indirizzo di prima arriva sull'anno, non su una voce che non c'è più.
  await valuta(page, "prova.vai({ pagina: 'pagina.impostazioni', scheda: 'calendario#file' })")
  await valuta(page, FRAME)
  expect(await valuta(page, 'prova.stato.posto.scheda')).toBe('calendario#anno')
  await expect(page.locator('section[data-sezione="anno"]')).toBeVisible()
  await expect(page.locator('[data-voce="file"], [data-voce="anni"]')).toHaveCount(0)
  expect(errori).toEqual([])
  await page.close()
})

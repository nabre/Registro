// Schede delle impostazioni: relazioni ARIA, roving tabindex e tastiera APG.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta } from './banco'

test('impostazioni tastiera', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "prova.vai({pagina:'pagina.impostazioni',scheda:'documento.anno'})")
  await valuta(page, FOTOGRAMMA)

  // I gruppi cambiano insieme di schede: pulsanti, non una falsa tablist annidata.
  const gruppi = page.locator('.impostazioni__gruppi')
  await expect(gruppi).not.toHaveAttribute('role', 'tablist')
  await expect(gruppi.locator('button[aria-pressed="true"]')).toHaveCount(1)

  const lista = page.locator('.impostazioni__sezioni[role="tablist"]')
  await expect(lista).toHaveCount(1)
  const schede = lista.getByRole('tab')
  const quante = await schede.count()
  expect(quante).toBeGreaterThan(1)
  await expect(lista.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1)
  await expect(lista.locator('[role="tab"][tabindex="0"]')).toHaveCount(1)
  await expect(lista.locator('[role="tab"][tabindex="-1"]')).toHaveCount(quante - 1)

  const riquadroScheda = page.getByRole('tabpanel')
  const attiva = lista.locator('[role="tab"][aria-selected="true"]')
  expect(await attiva.getAttribute('aria-controls'))
    .toBe(await riquadroScheda.getAttribute('id'))
  expect(await riquadroScheda.getAttribute('aria-labelledby'))
    .toBe(await attiva.getAttribute('id'))

  // Attivazione automatica. Il ridisegno conserva fuoco sulla nuova scheda.
  await attiva.focus()
  await page.keyboard.press('ArrowRight')
  await valuta(page, FOTOGRAMMA)
  const nuova = page.locator('.impostazioni__sezioni [role="tab"][aria-selected="true"]')
  await expect(nuova).toBeFocused()
  await expect(nuova).toHaveAttribute('tabindex', '0')

  await page.keyboard.press('End')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.impostazioni__sezioni [role="tab"]').last()).toBeFocused()
  await page.keyboard.press('Home')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.impostazioni__sezioni [role="tab"]').first()).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.impostazioni__sezioni [role="tab"]').last()).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await valuta(page, FOTOGRAMMA)
  await expect(page.locator('.impostazioni__sezioni [role="tab"]').nth(-2)).toBeFocused()

  expect(errori).toEqual([])
})

// La barra in fondo: la prossima ora secondo l'orologio e, a parte, le ore
// passate da chiudere con la loro tendina (numero, data, corso).
// Esecuzione: `npm run ui-tests`, o `npx playwright test -c tests/interfaccia/playwright.config.ts barraStato`.

import { expect, test } from '@playwright/test'

import { pannello } from './banco'

test('la barra separa la prossima ora dalle ore da chiudere', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const barra = page.locator('.barra-stato')
  await expect(barra).toBeVisible()

  // La prossima ora c'è sempre, anche quando ci sono buchi alle spalle: o la
  // lezione che viene, o «nessuna lezione in programma».
  await expect(barra.locator('.barra-stato__voce').first()).toBeVisible()

  const daChiudere = barra.locator('[data-fuoco="stato-da-chiudere"]')
  if (await daChiudere.count() > 0) {
    const quante = Number((await daChiudere.innerText()).match(/\d+/)?.[0])
    expect(quante).toBeGreaterThan(0)
    await daChiudere.click()
    await expect(daChiudere).toHaveAttribute('aria-expanded', 'true')
    const righe = page.locator('.menu__voce')
    await expect(righe).toHaveCount(quante)
    // Ogni riga: numero, data, corso.
    await expect(righe.first()).toHaveText(/·.*·/)
    await page.keyboard.press('Escape')
  }

  expect(errori).toEqual([])
})

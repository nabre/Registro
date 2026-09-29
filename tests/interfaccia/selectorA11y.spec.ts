// Scelte alternative: radio complete, una scelta e movimento da tastiera.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, FRAME, PAGINA_CON_TITOLO, pannello, valuta } from './banco'

test('selectorA11y', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { html: PAGINA_CON_TITOLO })
  await valuta(page, `()=>{
    const corso=prova.stato.registro.corsi[0]
    prova.scegliCorso(corso.id)
    prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.registro'))
  }`)
  await valuta(page, FRAME)

  const gruppi = page.getByRole('radiogroup')
  const quanti = await gruppi.count()
  expect(quanti).toBeGreaterThan(0)
  for (let indice = 0; indice < quanti; indice++) {
    const gruppo = gruppi.nth(indice)
    const radio = gruppo.getByRole('radio')
    const radioQuanti = await radio.count()
    expect(radioQuanti).toBeGreaterThan(1)
    await expect(gruppo.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1)
    await expect(gruppo.locator('[role="radio"][tabindex="0"]')).toHaveCount(1)
    await expect(gruppo.locator('[role="radio"][aria-checked="false"]')).toHaveCount(radioQuanti - 1)
  }

  const gruppo = gruppi.first()
  const attiva = gruppo.locator('[role="radio"][aria-checked="true"]')
  await attiva.focus()
  await page.keyboard.press('ArrowRight')
  await valuta(page, FOTOGRAMMA)
  const nuova = page.getByRole('radiogroup').first().locator('[role="radio"][aria-checked="true"]')
  await expect(nuova).toBeFocused()
  await expect(nuova).toHaveAttribute('tabindex', '0')

  expect(errori).toEqual([])
})

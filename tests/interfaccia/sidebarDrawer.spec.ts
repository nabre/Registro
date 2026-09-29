// Cassetto responsive: sovrapposizione, misure stabili e tastiera.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, riquadro, valuta, valutaSu } from './banco'

test('sidebar drawer', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 720, altezza: 850 })

  for (const width of [720, 900, 1024]) {
    await page.setViewportSize({ width, height: 850 })
    await valuta(page, 'prova.aggiorna({sidebarMobile:false})')
    await valuta(page, FOTOGRAMMA)
    const toggle = page.locator('[data-fuoco="apri-navigazione"]')
    const sidebar = page.locator('#navigazione-laterale')
    await expect(toggle).toHaveAttribute('aria-controls', 'navigazione-laterale')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const prima = await riquadro(page.locator('main'))
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.sidebar__sfondo')).toBeVisible()
    const dopo = await riquadro(page.locator('main'))
    expect(dopo, `${width}`).toEqual(prima)
    const scatola = await riquadro(sidebar)
    expect(scatola.x === 0 && scatola.width < width, `${width} ${JSON.stringify(scatola)}`)
      .toBeTruthy()
    expect(await valutaSu(sidebar, '(el)=>getComputedStyle(el).position')).toBe('fixed')
    await sidebar.getByRole('button', { name: 'Calendario', exact: true }).focus()
    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()

    await toggle.click()
    await sidebar.getByRole('button', { name: 'Corsi', exact: true }).click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()

    await toggle.click()
    await page.locator('.sidebar__sfondo').click({ position: { x: width - 10, y: 20 } })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()
  }

  // Sopra il punto di rottura resta la sidebar desktop, non un cassetto.
  await page.setViewportSize({ width: 1100, height: 850 })
  await valuta(page, 'prova.aggiorna({sidebarDesktop:true})')
  await expect(page.locator('.sidebar__sfondo')).toHaveCount(0)
  expect(await valutaSu(page.locator('#navigazione-laterale'),
    '(el)=>getComputedStyle(el).position')).not.toBe('fixed')
  expect(errori).toEqual([])
})

// La ricerca sempre visibile e il percorso accorciato.
//
// - La pastiglia «Cerca…» nella barra del titolo apre la stessa palette di
//   Ctrl+K, si toglie dall'area di trascinamento, e alla chiusura ridà il fuoco
//   a sé stessa.
// - La palette trova anche le persone in formazione, i corsi e le classi, sotto
//   i loro titoletti e nell'ordine fisso pagine → comandi → persone → corsi →
//   classi; senza accenti trova chi li ha; Invio porta dove si aspetta.
// - Il percorso in cima non ripete l'area della barra laterale né la linguetta
//   accesa, ma a voce li dice ancora.

import { expect, test, type Browser, type Page } from '@playwright/test'

import { FRAME, pannello, valuta, valutaSu } from './banco'

async function pagina (browser: Browser) {
  return await pannello(browser, { larghezza: 1440, altezza: 900 })
}

async function titoletti (page: Page): Promise<string[]> {
  return await page.locator('.palette__gruppo-titolo > span:first-child').allTextContents()
}

// Clic sulla pastiglia: la palette, il fuoco nel campo, e di nuovo sulla pastiglia dopo Esc.
test('pastiglia_apre_la_palette', async ({ browser }) => {
  const { page, errori } = await pagina(browser)
  const cerca = page.locator('.barra-titolo .barra-titolo__cerca')
  await expect(cerca).toHaveCount(1)
  await expect(cerca).toHaveAttribute('aria-keyshortcuts', 'Control+K')
  await expect(cerca).toContainText('Cerca')
  // La barra si trascina, la pastiglia no, o premerla sposterebbe la finestra.
  // Chromium legge la proprietà anche fuori da Electron.
  const regione = "el => getComputedStyle(el).getPropertyValue('-webkit-app-region')"
  expect(await valutaSu(page.locator('.barra-titolo'), regione)).toBe('drag')
  expect(await valutaSu(cerca, regione)).toBe('no-drag')
  await cerca.click()
  const campo = page.locator('.palette__campo')
  await expect(campo).toBeFocused()
  // A campo vuoto: pagine e comandi, e la scelta su una riga che funziona.
  expect(await titoletti(page)).toEqual(['Pagine', 'Comandi'])
  const scelta = page.locator('.palette__voce--scelta')
  await expect(scelta).not.toHaveClass(/palette__voce--impedita/)
  await expect(page.locator('.palette__piede kbd')).toHaveCount(4)
  await campo.press('Escape')
  await expect(page.locator('.palette')).toHaveCount(0)
  await expect(page.locator('.barra-titolo__cerca')).toBeFocused()
  expect(errori).toEqual([])
  await page.close()
})

// «esémpio» trova le due Anna, ognuna con la sua classe; Invio apre la scheda.
test('persone_corsi_classi', async ({ browser }) => {
  const { page, errori } = await pagina(browser)
  await page.locator('body').press('Control+k')
  const campo = page.locator('.palette__campo')
  // L'accento in più non conta, e le maiuscole nemmeno.
  await campo.fill('esémpio')
  const persone = page.locator('.palette__gruppo')
    .filter({ hasText: 'Persone in formazione' }).locator('.palette__voce')
  await expect(persone).toHaveCount(2)
  expect(await persone.locator('.palette__aiuto').allInnerTexts()).toEqual(['DIC4a', 'DIC4b'])
  await campo.press('ArrowDown')
  await campo.press('Enter')
  await valuta(page, FRAME)
  const seconda = await valuta<{ id: string, allievi: { id: string }[] }>(
    page, 'prova.stato.registro.classi[1]',
  )
  expect(await valuta(page, 'prova.stato.vista')).toBe('allievo')
  expect(await valuta(page, 'prova.stato.allievoId')).toBe(seconda.allievi[0].id)
  expect(await valuta(page, 'prova.stato.classeId')).toBe(seconda.id)

  // «dic4b»: la persona, il corso e la classe, in quest'ordine.
  await page.locator('body').press('Control+k')
  await page.locator('.palette__campo').fill('dic4b')
  expect(await titoletti(page)).toEqual(['Persone in formazione', 'Corsi', 'Classi'])
  await page.locator('.palette__gruppo').filter({ hasText: 'Corsi' }).locator('.palette__voce').click()
  await valuta(page, FRAME)
  const corso = await valuta<{ id: string, classeId: string }>(page, 'prova.stato.registro.corsi[1]')
  expect(await valuta(page, 'prova.stato.vista')).toBe('corsi')
  expect(await valuta(page, 'prova.stato.corsoId')).toBe(corso.id)
  expect(await valuta(page, 'prova.stato.filtroClasseId')).toBe(corso.classeId)

  await page.locator('body').press('Control+k')
  await page.locator('.palette__campo').fill('dic4b')
  await page.locator('.palette__gruppo').filter({ hasText: 'Classi' }).locator('.palette__voce').click()
  await valuta(page, FRAME)
  expect(await valuta(page, 'prova.stato.vista')).toBe('classi')
  expect(await valuta(page, 'prova.stato.classeId')).toBe(seconda.id)
  expect(errori).toEqual([])
  await page.close()
})

// In cima non c'è «Registro» né la linguetta; nell'etichetta sì.
test('percorso_corto_ma_intero_a_voce', async ({ browser }) => {
  const { page, errori } = await pagina(browser)
  const lezione = await valuta<string>(page, 'prova.stato.registro.lezioni[0].id')
  await valuta(page, `prova.apriLezione('${lezione}')`)
  await valuta(page, FRAME)
  const percorso = page.locator('.barra-titolo .percorso')
  await expect(percorso.locator('.percorso__passo--mestiere')).toHaveCount(0)
  await expect(percorso.locator('.percorso__passo--porzione')).toHaveCount(0)
  await expect(percorso.locator('.percorso__passo--qui')).toHaveCount(1)
  const etichetta = (await percorso.getAttribute('aria-label')) ?? ''
  expect(etichetta).toContain('Area Registro')
  expect(etichetta).toContain('Scheda ')
  expect(errori).toEqual([])
  await page.close()
})

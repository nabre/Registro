// Aprire una pagina in una finestra nuova, dalla pagina (con il ponte finto):
// il pulsante «Nuova finestra» a sinistra di «Cerca», il tasto destro su una
// voce della barra laterale, Ctrl+clic e clic centrale. Tutti mandano
// `finestra.nuova` con il posto e il contesto di adesso; al tetto delle figlie
// il pulsante è spento e dice perché. Che la finestra nasca davvero lo prova
// `childWindows.spec.ts`, nel registro vero.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, ULTIMA, attendi, pannello, valuta } from './banco'

const QUANTE = "() => richieste.filter(m=>m.azione?.tipo==='finestra.nuova').length"

test('nuova finestra: pulsante, tasto destro, Ctrl+clic e clic centrale', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "prova.vai({ pagina: 'pagina.calendario' })")
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0')

  // Il pulsante della riga dei comandi: la pagina di adesso.
  const nuova = page.getByRole('button', { name: 'Nuova finestra' })
  await expect(nuova).toHaveAttribute('title', /Ctrl\+Maiusc\+N/)
  await nuova.click()
  await attendi(page, `(${QUANTE})() === 1`)
  expect(await valuta(page, `(${ULTIMA})('finestra.nuova')`))
    .toMatchObject({ posto: { pagina: 'pagina.calendario' } })

  // Il tasto destro su una voce della barra laterale.
  const voce = page.locator('.sidebar__pagina[data-fuoco="pagina.oggi"]')
  await voce.click({ button: 'right' })
  await page.getByRole('menuitem', { name: /Apri in una nuova finestra/ }).click()
  await attendi(page, `(${QUANTE})() === 2`)
  expect(await valuta(page, `(${ULTIMA})('finestra.nuova')`)).toMatchObject({ posto: { pagina: 'pagina.oggi' } })

  // Ctrl+clic e clic centrale: la pagina non cambia qui.
  await voce.click({ modifiers: ['Control'] })
  await attendi(page, `(${QUANTE})() === 3`)
  await voce.click({ button: 'middle' })
  await attendi(page, `(${QUANTE})() === 4`)
  expect(await valuta(page, 'prova.stato.posto.pagina')).toBe('pagina.calendario')

  // Al tetto (quattro figlie di serie) il pulsante è spento e dice perché.
  await valuta(page, `() => window.postMessage({ tipo: 'finestre', ruolo: 'principale', numero: 1,
    elenco: [1, 2, 3, 4, 5].map((n) => ({ n, titolo: '' })) }, '*')`)
  await valuta(page, FOTOGRAMMA)
  await expect(nuova).toBeDisabled()
  await expect(nuova).toHaveAttribute('title', /Ci sono già 4 finestre in più/)
  await expect(page.locator('.barra-titolo__finestra')).toHaveText('Principale · 5')

  expect(errori).toEqual([])
  await page.close()
})

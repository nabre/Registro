// La data con cui si nomina una lezione porta il giorno della settimana in tre
// lettere, «gio 01.10.2026». Nel testo le lettere restano minuscole (si leggono,
// si copiano, si cercano così); il maiuscoletto è del foglio di stile, e qui si
// guarda che ci sia davvero: è la sola cosa che il DOM sintetico non vede.

import { expect, test } from '@playwright/test'

import { FRAME, pannello, valuta } from './banco'

test('la testata dell’ora dice il giorno in maiuscoletto', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const { id, data } = await valuta<{ id: string, data: string }>(
    page, '({ id: prova.stato.registro.lezioni[0].id, data: prova.stato.registro.lezioni[0].data })',
  )
  await valuta(page, `prova.apriLezione('${id}')`)
  await valuta(page, FRAME)

  const [anno, mese, giorno] = data.split('-')
  const tre = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'][(new Date(`${data}T12:00:00Z`).getUTCDay() + 6) % 7]
  const etichetta = page.locator('.vista--lezione .testata__sottotitolo .data-lezione')
  await expect(etichetta).toHaveText(`${tre} ${giorno}.${mese}.${anno}`)

  const giornoDellaSettimana = etichetta.locator('.data-lezione__giorno')
  await expect(giornoDellaSettimana).toHaveText(tre)
  expect(await giornoDellaSettimana.evaluate((nodo) => getComputedStyle(nodo).fontVariantCaps))
    .toBe('all-small-caps')

  expect(errori).toEqual([])
  await page.close()
})

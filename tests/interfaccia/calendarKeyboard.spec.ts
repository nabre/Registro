// Calendario mensile: giorni raggiungibili e azionabili da tastiera.
//
// Prerequisiti: Chromium di Playwright installato; npm install.
// Esecuzione dalla cartella app: `node esbuild.mjs --ui` e poi
// `npx playwright test -c tests/interfaccia/playwright.config.ts calendarKeyboard`.

import { expect, test } from '@playwright/test'

import { FRAME, pannello, valuta } from './banco'

test('calendarKeyboard', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  await valuta(page, "prova.aggiorna({modoCalendario:'mese', data:'2026-09-16'})")
  await valuta(page, FRAME)

  // Nome completo, ruolo compatibile coi pulsanti delle lezioni annidati e scorciatoie esposte.
  let giorno = page.getByRole('group', { name: /lunedì 14 settembre 2026/i })
  await expect(giorno).toHaveCount(1)
  await expect(giorno).toHaveAttribute('tabindex', '0')
  await expect(giorno).toHaveAttribute('aria-keyshortcuts', 'Enter Space F2')

  // Tab dalla settimana entra nel primo giorno, senza ricorrere al puntatore.
  const settimana = page.locator('.mese__settimana').filter({ has: giorno })
    .locator('.mese__settimana-numero')
  await settimana.focus()
  await page.keyboard.press('Tab')
  const primo = page.locator('.mese__settimana').filter({ has: giorno })
    .locator('.mese__cella').first()
  await expect(primo).toBeFocused()

  // Invio e Spazio eseguono l'azione primaria: scelgono il giorno.
  await primo.press('Enter')
  await valuta(page, FRAME)
  expect(await valuta(page, 'prova.stato.data')).toBe('2026-09-14')

  giorno = page.getByRole('group', { name: /martedì 15 settembre 2026/i })
  await giorno.press('Space')
  await valuta(page, FRAME)
  expect(await valuta(page, 'prova.stato.data')).toBe('2026-09-15')

  // F2 sostituisce il doppio clic in modifica e apre il modulo sul giorno scelto.
  await valuta(page, 'prova.aggiorna({editorCalendario:true, filtroCorsoAgendaId:null})')
  await valuta(page, FRAME)
  giorno = page.getByRole('group', { name: /lunedì 14 settembre 2026/i })
  await giorno.press('F2')
  await expect(page.locator('.modale')).toBeVisible()
  await expect(page.locator('.modale input[type="hidden"][name="data"]'))
    .toHaveValue('2026-09-14')

  expect(errori).toEqual([])
})

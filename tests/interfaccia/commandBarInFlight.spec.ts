// I comandi della barra in volo, su Chromium: quel che provava
// `tests/ui/commandBarInFlight.test.mjs` su un DOM finto, dall'esterno.
//
// - un comando che parla con l'host spegne il suo pulsante e lo segna
//   occupato (`aria-busy`) finché la risposta non torna, anche se nel
//   frattempo la barra si ridisegna, e un clic sul pulsante spento non lo
//   rilancia;
// - tornata la risposta il pulsante si riaccende, che sia un sì o un no;
// - un comando che non aspetta l'host (apre una finestra) non si spegne.
//
// Il ponte trattiene le risposte (`trattieni`) e le manda con `rilascia()`;
// `window.rifiuta` fa rispondere di no a `lezione.stato`.

import { expect, test, type Page } from '@playwright/test'

import { FOTOGRAMMA, attendi, attendiRisposte, pannello, ponte, valuta } from './banco'

const RIFIUTA = "m.azione?.tipo === 'lezione.stato' && window.rifiuta" +
  " ? { tipo: 'risposta', id: m.id, ok: false, errori: ['Rifiutata dalla prova.'] }" +
  " : { tipo: 'risposta', id: m.id, ok: true }"

const QUANTE = "richieste.filter(m=>m.azione?.tipo==='lezione.stato').length"

// Un ridisegno che non porta la risposta: lo stesso registro, rimesso.
const RIDISEGNO = '() => prova.aggiorna({ registro: { ...prova.stato.registro } })'

/** La pagina dell'ora del 14 settembre, finita: «Conclusa» si può premere. */
async function apriOra (page: Page): Promise<void> {
  await valuta(page, '() => prova.apriLezione(prova.stato.registro.lezioni[0].id)')
  await valuta(page, FOTOGRAMMA)
}

function barra (page: Page) {
  return page.getByRole('region', { name: /^Azioni/ })
}

test('un comando in volo resta spento dopo un ridisegno e si riaccende alla risposta', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(RIFIUTA) })
  await apriOra(page)
  const conclusa = barra(page).getByRole('button', { name: 'Conclusa', exact: true })
  await expect(conclusa).toBeEnabled()
  await expect(conclusa).not.toHaveAttribute('aria-busy', 'true')

  await valuta(page, 'trattieni = true; richieste.length = 0')
  await conclusa.click()
  await attendi(page, `${QUANTE} === 1`)
  await expect(conclusa).toBeDisabled()
  await expect(conclusa).toHaveAttribute('aria-busy', 'true')

  // La barra si ridisegna prima della risposta: il pulsante rinato è ancora spento.
  await valuta(page, RIDISEGNO)
  await valuta(page, FOTOGRAMMA)
  await expect(conclusa).toBeDisabled()
  await expect(conclusa).toHaveAttribute('aria-busy', 'true')
  // Un clic sul pulsante spento non rilancia il comando.
  await conclusa.click({ force: true })
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, QUANTE)).toBe(1)

  await valuta(page, 'trattieni = false; rilascia()')
  await attendiRisposte(page)
  await expect(conclusa).toBeEnabled()
  await expect(conclusa).not.toHaveAttribute('aria-busy', 'true')

  expect(errori).toEqual([])
  await page.close()
})

test('un no dall’host riaccende il pulsante lo stesso', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(RIFIUTA) })
  await apriOra(page)
  const conclusa = barra(page).getByRole('button', { name: 'Conclusa', exact: true })

  await valuta(page, 'rifiuta = true; trattieni = true; richieste.length = 0')
  await conclusa.click()
  await attendi(page, `${QUANTE} === 1`)
  await expect(conclusa).toHaveAttribute('aria-busy', 'true')
  await valuta(page, RIDISEGNO)
  await valuta(page, FOTOGRAMMA)
  await expect(conclusa).toBeDisabled()

  await valuta(page, 'trattieni = false; rilascia()')
  await attendiRisposte(page)
  await expect(conclusa).toBeEnabled()
  await expect(conclusa).not.toHaveAttribute('aria-busy', 'true')
  // Il no lo dice una notifica.
  await expect(page.locator('.notifica--errore')).toContainText('Rifiutata dalla prova.')

  expect(errori).toEqual([])
  await page.close()
})

test('un comando che non aspetta l’host non si spegne', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await apriOra(page)
  const supplenza = barra(page).getByRole('button', { name: 'Prepara la supplenza', exact: true })
  await valuta(page, 'richieste.length = 0')
  await supplenza.click()
  const dialogo = page.getByRole('dialog', { name: 'Prepara la supplenza' })
  await expect(dialogo).toBeVisible()
  await expect(supplenza).toBeEnabled()
  await expect(supplenza).not.toHaveAttribute('aria-busy', 'true')
  // Niente verso l'host, a parte le azioni di fondo che seguono il posto.
  expect(await valuta(page,
    "richieste.filter(m => m.azione && !['proiezione.mira', 'assistente.contesto'].includes(m.azione.tipo)).length"))
    .toBe(0)
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

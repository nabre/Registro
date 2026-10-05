// I campi non controllati che dopo un gesto riuscito devono tornare come
// prima: il disegno di React non rifà il nodo, quindi tocca al gestore.
//
// - Calendari ICS: un indirizzo aggiunto svuota il campo, e così una regola
//   nuova; un secondo «Aggiungi» non rimanda lo stesso testo.
// - Appello: la nota aperta con «+», scritta e lasciata, torna «+» quando poi
//   si svuota da fuori (annulla, altra scrittura).

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, attendi, attendiRisposte, pannello, valuta } from './banco'

const QUANTE = '(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).length'

test('calendari ICS: aggiunto un indirizzo o una regola, il campo si svuota', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, "prova.vai({ pagina: 'pagina.impostazioni', scheda: 'calendario#ics' })")
  await valuta(page, FOTOGRAMMA)

  const indirizzo = page.locator('input[name="calendario-nuovo"]')
  await expect(indirizzo).toHaveCount(1)
  await indirizzo.fill('https://esempio.ch/calendario.ics')
  await page.locator('.ics-sorgente--nuova').locator('button', { hasText: 'Aggiungi' }).click()
  await attendi(page, `(${QUANTE})('calendario.aggiungi') === 1`)
  await attendiRisposte(page)
  await expect(indirizzo).toHaveValue('')

  // Con Invio, lo stesso.
  await indirizzo.fill('https://esempio.ch/altro.ics')
  await indirizzo.press('Enter')
  await attendi(page, `(${QUANTE})('calendario.aggiungi') === 2`)
  await attendiRisposte(page)
  await expect(indirizzo).toHaveValue('')

  const regola = page.locator('input[name="regola-nuova-testo"]')
  await regola.fill('Riunione')
  await page.locator('.ics-regola--nuova').locator('button', { hasText: 'Aggiungi' }).click()
  await attendi(page, `(${QUANTE})('impostazioni.salva') === 1`)
  await attendiRisposte(page)
  await expect(regola).toHaveValue('')

  expect(errori).toEqual([])
  await page.close()
})

// Un'ora del primo corso con una persona sola, senza note, aperta sull'appello.
const ORA = `() => {
  const r = prova.stato.registro
  const classe = r.classi[0]
  const allievi = [{ ...classe.allievi[0], id: 'al-nota', cognome: 'Nota' }]
  const classi = r.classi.map((c) => c.id === classe.id ? { ...c, allievi } : c)
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const lezione = { ...base, id: 'lez-nota', stato: 'pianificata', matrice: [], presenze: [] }
  prova.aggiorna({ registro: { ...r, classi, lezioni: [...r.lezioni, lezione] } })
  prova.apriLezione('lez-nota')
  prova.aggiorna({ schedaLezione: 'amministrazione' })
}`

/** Mette la nota della persona nello stato, come farebbe l'host. */
const NOTA = `(nota) => {
  const r = prova.stato.registro
  const lezioni = r.lezioni.map((l) => l.id === 'lez-nota'
    ? { ...l, presenze: [{ allievoId: 'al-nota', stati: [], nota }] } : l)
  prova.aggiorna({ registro: { ...r, lezioni } })
}`

test('appello: la nota scritta e poi svuotata da fuori torna «+»', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, ORA)
  await valuta(page, FOTOGRAMMA)

  const piu = page.locator('.appello__aggiungi-nota')
  await expect(piu).toHaveCount(1)
  await piu.click()
  const campo = page.locator('.appello__nota input')
  await expect(campo).toBeFocused()
  await campo.fill('In ritardo col compito')
  await campo.press('Tab')
  await attendi(page, `(${QUANTE})('presenze.campi') === 1`)
  await attendiRisposte(page)

  // L'host la salva, poi un annulla la toglie.
  await valuta(page, NOTA, 'In ritardo col compito')
  await valuta(page, FOTOGRAMMA)
  await expect(campo).toHaveValue('In ritardo col compito')
  await valuta(page, NOTA, '')
  await valuta(page, FOTOGRAMMA)
  await expect(campo).toHaveCount(0)
  await expect(piu).toHaveCount(1)

  expect(errori).toEqual([])
  await page.close()
})

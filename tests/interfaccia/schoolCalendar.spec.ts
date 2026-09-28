// Il calendario scolastico ufficiale nel modulo di un anno nuovo, su Chromium.
//
// - in cima la tendina «Anno scolastico», con gli anni del calendario: il primo
//   è già scelto all'apertura, e con lui date e chiusure sono già nell'editor;
// - sceglierne un altro scrive inizio, fine, etichetta e confine del primo
//   semestre, e porta **tutte** le chiusure di quell'anno, collegate
//   (`sos-ti-…`), al posto di quelle dell'anno di prima; l'anno nascerà
//   collegato, e la sezione del calendario lo dice («seguirà»), con le
//   chiusure ufficiali da leggere e basta;
// - «date scritte a mano» lo stacca: le chiusure tornano righe da cambiare, e
//   la sezione dice «allineato»;
// - una chiusura tolta dall'editor torna fra le voci da importare (e una di un
//   giorno dice anche il mese), e `anno.crea` parte senza di lei;
// - in fondo, ben visibile, «Importa da un altro registro».

import { expect, test } from '@playwright/test'

import { attendi, pannello, valuta } from './banco'

interface Messaggio {
  azione?: { tipo?: string, inizio?: string, sospensioni?: { id: string }[] }
}

test('schoolCalendar', async ({ browser }) => {
  const { page, errori } = await pannello(browser)

  await page.locator('.barra-comandi__programma').click()
  await page.getByText('Nuovo anno scolastico').first().click()
  const modale = page.locator('form.modale')
  await expect(modale).toHaveCount(1)

  const scelta = modale.locator('.calendario-ufficiale__anno select')
  await expect(scelta).toHaveCount(1)
  // Il primo anno proposto è già scelto, con le sue chiusure nell'editor.
  const primo = await scelta.locator('option').first().getAttribute('value')
  expect(await scelta.inputValue()).toBe(primo)
  const righe = modale.locator('.pausa-riga')
  const quanteRighe = await righe.count()
  expect(quanteRighe, String(quanteRighe)).toBeGreaterThan(3)
  await expect(modale.locator('.calendario-ufficiale')).toContainText('seguirà')

  await expect(scelta.locator('option', { hasText: '2027/2028' })).toHaveCount(1)
  await scelta.selectOption('2027/2028')

  const valore = async (nome: string) =>
    await modale.locator(`input[name="${nome}"]`).first().inputValue()
  expect(await valore('inizio')).toBe('2027-08-30')
  expect(await valore('fine')).toBe('2028-06-14')
  expect(await valore('etichetta')).toBe('2027/2028')
  expect(await valore('confine')).toBe('2028-01-31')
  await expect(modale.locator('.calendario-ufficiale')).toContainText('seguirà')
  await expect(modale.locator('.pausa-riga--ufficiale')).toHaveCount(await righe.count())

  // Scritte a mano, le stesse date: niente da importare, e le righe si cambiano.
  await scelta.selectOption('')
  await expect(modale.locator('.calendario-ufficiale')).toContainText('allineato')
  await expect(modale.locator('.pausa-riga--ufficiale')).toHaveCount(0)
  const nomi: string[] = []
  const quante = await righe.count()
  for (let i = 0; i < quante; i++) {
    nomi.push(await righe.nth(i).locator('.pausa-riga__nome').inputValue())
  }
  expect(nomi.includes('Vacanze di Natale') && nomi.includes('Immacolata'),
    JSON.stringify(nomi)).toBeTruthy()

  // Tolta dall'editor, l'Immacolata torna fra le voci da importare.
  await righe.nth(nomi.indexOf('Immacolata')).locator('button').click()
  const voci = modale.locator('.calendario-ufficiale__voce')
  await expect(voci).toHaveCount(1)
  await expect(voci.filter({ hasText: 'Immacolata' })).toContainText('dicembre')

  await expect(modale.getByText('Importa da un altro registro')).toBeVisible()

  await modale.locator('button[type=submit]').first().click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='anno.crea')")
  const crea = (await valuta<Messaggio[]>(page, 'richieste'))
    .filter((m) => m.azione?.tipo === 'anno.crea')
    .map((m) => m.azione!)
  expect(crea.length, JSON.stringify(crea)).toBe(1)
  expect(crea[0].inizio).toBe('2027-08-30')
  const ids = crea[0].sospensioni!.map((s) => s.id)
  expect(ids).toContain('sos-ti-2027-2028-vacanze-di-natale')
  expect(ids).not.toContain('sos-ti-2027-2028-immacolata')
  expect(ids.every((i) => i.startsWith('sos-ti-2027-2028-')), JSON.stringify(ids)).toBeTruthy()
  expect(ids.length, JSON.stringify({ ids, nomi })).toBe(nomi.length - 1)

  expect(errori).toEqual([])
})

// Una tappa del piano verifica più colonne del check, scelte nel suo dettaglio.
//
// Il dettaglio aveva una tendina a scelta sola: più colonne si legavano soltanto
// dalla pagina dei piani («Lega alla tappa del check»), e dal dettaglio non se
// ne poteva aggiungere o togliere una. Adesso una casella per colonna, più
// «tutte»: qui si guarda che cosa parte con `piano.salva` a ogni clic.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, pannello, valuta } from './banco'

// Un piano con una tappa che verifica la prima di tre colonne del check.
const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const tappa = { id: 't1', titolo: 'Firme', tipo: 'spiegazione', durataUd: 1, descrizione: '',
    materiali: '', raggruppamento: 'plenaria', risorse: [], parametri: { checkColonnaId: 'c1' } }
  const piano = { id: 'piano-prova', corsoId: corso.id, obiettivi: ['Inizio'], prerequisiti: '',
    attivita: [tappa], risorse: [], note: '', tag: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  const check = { id: 'chk-prova', corsoId: corso.id,
    colonne: [{ id: 'c1', titolo: 'Regolamento' }, { id: 'c2', titolo: 'Quaderno' },
      { id: 'c3', titolo: 'Libretto' }],
    spunte: [], creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  prova.vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: piano.id } },
    { contesto: { corsoId: corso.id }, altro: { registro: { ...r, piani: [piano], check: [check] } } })
}`

const ULTIMO_SALVATO =
  "richieste.filter(m=>m.azione?.tipo==='piano.salva').at(-1)?.azione.piano.attivita[0].parametri?.checkColonnaId ?? null"

test('tappa con più colonne del check', async ({ browser }) => {
  const { page, errori } = await pannello(browser)

  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  await page.locator('.piano-editor .attivita-riga__apri').first().click()

  const gruppo = page.locator('.piano-editor .campo-tappa--colonne')
  await expect(gruppo).toHaveCount(1)
  const casella = (testo: string) =>
    gruppo.locator('label', { hasText: testo }).locator('input[type="checkbox"]')
  const tutte = gruppo.locator('label').first().locator('input[type="checkbox"]')

  // La sola colonna legata è spuntata e non si toglie: la tappa si spegne
  // dall'interruttore.
  await expect(tutte).not.toBeChecked()
  await expect(casella('Regolamento')).toBeChecked()
  await expect(casella('Regolamento')).toBeDisabled()
  await expect(casella('Quaderno')).not.toBeChecked()

  const clicca = async (testo: string, atteso: string) => {
    await valuta(page, 'richieste.length = 0')
    await casella(testo).click()
    await valuta(page, FOTOGRAMMA)
    expect(await valuta(page, ULTIMO_SALVATO), `dopo «${testo}»`).toBe(atteso)
  }

  // Si aggiungono nell'ordine delle colonne, non in quello dei clic.
  await clicca('Libretto', 'c1,c3')
  await clicca('Quaderno', 'c1,c2,c3')
  await clicca('Regolamento', 'c2,c3')
  await expect(casella('Regolamento')).not.toBeChecked()

  // «Tutte» le spunta e le blocca; toglierla lascia spuntate tutte, una per una.
  await valuta(page, 'richieste.length = 0')
  await tutte.click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, ULTIMO_SALVATO)).toBe('tutte')
  await expect(casella('Quaderno')).toBeChecked()
  await expect(casella('Quaderno')).toBeDisabled()

  await valuta(page, 'richieste.length = 0')
  await tutte.click()
  await valuta(page, FOTOGRAMMA)
  expect(await valuta(page, ULTIMO_SALVATO)).toBe('c1,c2,c3')
  await expect(casella('Quaderno')).toBeEnabled()

  expect(errori).toEqual([])
})

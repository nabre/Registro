import { expect, test } from '@playwright/test'
import { FOTOGRAMMA, ULTIMA, attendi, pannello, valuta } from './banco'

const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const ist = '2026-09-01T08:00:00.000Z'
  const progetto = { id: 'progetto-scaletta', corsoId: corso.id, titolo: 'Ricerca condivisa',
    obiettivi: [], stato: 'bozza', fasi: [
      { id: 'fase-a', titolo: 'Preparazione', descrizione: 'Raccogliere le idee' },
      { id: 'fase-b', titolo: 'Presentazione', descrizione: 'Condividere i risultati' }],
    attivita: [
      { id: 'idea', faseId: 'fase-a', titolo: 'Idee iniziali', tipo: 'spiegazione', durataUd: 0.5 },
      { id: 'ricerca', faseId: 'fase-a', titolo: 'Ricerca autonoma', tipo: 'spiegazione', durataUd: 0.5 },
      { id: 'laboratorio', faseId: 'fase-a', titolo: 'Laboratorio lungo', tipo: 'spiegazione', durataUd: 2 },
      { id: 'presentazione', faseId: 'fase-b', titolo: 'Presentare', tipo: 'spiegazione', durataUd: 0.5 }],
    criteri: [], livelli: [], compiti: [], giudizi: [], matrice: [], risorse: [],
    creatoIl: ist, aggiornatoIl: ist }
  const piano = { id: 'piano-scaletta', corsoId: corso.id, obiettivi: [], prerequisiti: '',
    attivita: [], risorse: [], tag: [], creatoIl: ist, aggiornatoIl: ist }
  const base = r.lezioni.find((l) => l.corsoId === corso.id)
  const lezione = { ...base, id: 'ora-scaletta', pianoId: piano.id, stato: 'pianificata',
    avanzamento: [], slot: [{ id: 's1', tipo: 'lezione', inizio: '08:00', fine: '08:45' }] }
  prova.vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: piano.id } }, {
    contesto: { corsoId: corso.id, lezioneId: lezione.id },
    altro: { registro: { ...r, impostazioni: { ...r.impostazioni, minutiUd: 45 },
      progetti: [progetto], piani: [piano], lezioni: [lezione] } } })
}`

test('importazione di una parte della fase e durata locale', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PREPARA)
  await valuta(page, FOTOGRAMMA)
  await page.getByRole('button', { name: 'Importa dal progetto', exact: true }).click()
  const modale = page.locator('form.modale')
  await expect(modale.locator('input[type="checkbox"]')).toHaveCount(3)
  await expect(modale.locator('[data-attivita-progetto-id="idea"]')).toBeChecked()
  await expect(modale.locator('[data-attivita-progetto-id="ricerca"]')).toBeChecked()
  await expect(modale.locator('[data-attivita-progetto-id="laboratorio"]')).not.toBeChecked()
  await expect(modale).toContainText('Un’attività rimane per un’altra lezione.')
  await modale.locator('[data-attivita-progetto-id="laboratorio"]').check()
  await modale.getByRole('button', { name: 'Importa le attività selezionate' }).click()
  await expect(modale).toContainText('Le attività selezionate superano il tempo disponibile.')
  await modale.locator('[data-attivita-progetto-id="laboratorio"]').uncheck()
  await valuta(page, 'richieste.length = 0')
  await modale.getByRole('button', { name: 'Importa le attività selezionate' }).click()
  await attendi(page, "richieste.some(m => m.azione?.tipo === 'piano.salva')")
  type PianoSalvato = {
    piano: { attivita: Array<{ attivitaProgettoId: string, risorse: unknown[] }> }
  }
  const salvato = await valuta<PianoSalvato>(
    page, ULTIMA, 'piano.salva',
  )
  expect(salvato.piano.attivita.map((a) => a.attivitaProgettoId)).toEqual(['idea', 'ricerca'])
  expect(salvato.piano.attivita.every((a) => a.risorse.length === 0)).toBe(true)
  // La lezione successiva propone il residuo, tenendo le prime attività
  // selezionabili per una ripetizione esplicita.
  await valuta(page, `(salvato) => {
    const r = prova.stato.registro
    const base = r.lezioni[0]
    const prossimo = { ...salvato.piano, id: 'piano-successivo', attivita: [] }
    const lezione = { ...base, id: 'ora-successiva', pianoId: prossimo.id,
      data: '2026-10-05', slot: [{ id: 's2', tipo: 'lezione', inizio: '08:00', fine: '09:30' }] }
    prova.vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: prossimo.id } }, {
      contesto: { lezioneId: lezione.id }, altro: { registro: { ...r,
        piani: [salvato.piano, prossimo], lezioni: [base, lezione] } } })
  }`, salvato)
  await valuta(page, FOTOGRAMMA)
  await page.getByRole('button', { name: 'Importa dal progetto', exact: true }).click()
  const seconda = page.locator('form.modale')
  await expect(seconda.locator('[data-attivita-progetto-id="idea"]')).not.toBeChecked()
  await expect(seconda.locator('[data-attivita-progetto-id="ricerca"]')).not.toBeChecked()
  await expect(seconda.locator('[data-attivita-progetto-id="laboratorio"]')).toBeChecked()
  await expect(seconda).toContainText('Pianificata')
  expect(errori).toEqual([])
})

test('scaletta nella fase e descrizione conservano le altre fasi', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PREPARA)
  await valuta(page, `() => prova.vai({ pagina: 'pagina.corso.progetti',
    soggetto: { tipo: 'progetto', id: 'progetto-scaletta' } })`)
  await valuta(page, FOTOGRAMMA)
  const fase = page.locator('.fase-progetto').first()
  await fase.locator('.fase-progetto__interruttore').click()
  await expect(fase).toContainText('Raccogliere le idee')
  await expect(fase.locator('[data-attivita-progetto-id]')).toHaveCount(3)
  await fase.getByRole('button', { name: 'Modifica scaletta' }).click()
  const modale = page.locator('form.modale')
  await expect(modale.locator('.scelta-progetto')).toHaveCount(0)
  await modale.locator('.attivita-riga__titolo').first().fill('Idee condivise')
  await modale.locator('.attivita-riga__titolo').first().blur()
  await modale.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.some(m => m.azione?.tipo === 'progetto.salva')")
  type ScalettaSalvata = {
    progetto: { attivita: Array<{ id: string, titolo: string, faseId: string }> }
  }
  const salvato = await valuta<ScalettaSalvata>(
    page, ULTIMA, 'progetto.salva',
  )
  expect(salvato.progetto.attivita.find((a) => a.id === 'idea')?.titolo).toBe('Idee condivise')
  expect(salvato.progetto.attivita.find((a) => a.id === 'presentazione')?.faseId).toBe('fase-b')
  await page.locator('.vista--progetti').getByRole('button', { name: 'Fasi', exact: true }).click()
  const fasi = page.locator('form.modale')
  await fasi.getByRole('textbox', { name: 'Descrizione', exact: true }).first().fill('Preparare insieme')
  await fasi.getByRole('button', { name: 'Salva', exact: true }).click()
  await attendi(page, "richieste.filter(m => m.azione?.tipo === 'progetto.salva').length === 2")
  const modificato = await valuta<{ progetto: { fasi: Array<{ descrizione: string }> } }>(page, ULTIMA, 'progetto.salva')
  expect(modificato.progetto.fasi[0].descrizione).toBe('Preparare insieme')
  expect(modificato.progetto.fasi[1].descrizione).toBe('Condividere i risultati')
  expect(errori).toEqual([])
})

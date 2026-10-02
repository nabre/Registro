import { expect, test } from '@playwright/test'
import { FRAME, pannello, schermata, valuta } from './banco'

const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const ora = r.lezioni.find(l => l.corsoId === corso.id)
  const risorsa = { id: 'file1', tipo: 'file', titolo: 'Scheda condivisa',
    file: 'materiali/scheda.pdf', nome: 'scheda.pdf', aggiuntaIl: '2026-09-01T08:00:00Z' }
  const tappa = { id: 't1', titolo: 'Lavoro in gruppo', tipo: 'spiegazione', durataUd: 1,
    risorse: [risorsa], progettoId: 'pr1', faseProgettoId: 'f1',
    parametri: { consegnaId: 'co1', checkColonnaId: 'c1,c2' },
    valutazione: { titolo: 'Prova prevista', tipo: 'scritto', peso: 1 } }
  const piano = { id: 'p1', corsoId: corso.id, obiettivi: ['Obiettivo'],
    attivita: [tappa], risorse: [risorsa], tag: [],
    creatoIl: '2026-09-01T08:00:00Z', aggiornatoIl: '2026-09-01T08:00:00Z' }
  const progetto = { id: 'pr1', corsoId: corso.id, titolo: 'Ponte', stato: 'bozza',
    obiettivi: [], fasi: [{ id: 'f1', titolo: 'Preparazione' }], criteri: [], livelli: [],
    compiti: [], giudizi: [], matrice: [],
    risorse: [{ ...risorsa, id: 'link1', tipo: 'collegamento', titolo: 'Materiale del progetto',
      file: undefined, url: 'https://example.com/materiale' }],
    creatoIl: piano.creatoIl, aggiornatoIl: piano.aggiornatoIl }
  const momento = { ...(r.valutazioni[0] ?? {}), id: 'v1', corsoId: corso.id,
    lezioneId: 'l1', pianoId: 'p1', attivitaId: 't1', progettoId: 'pr1',
    titolo: 'Prova svolta', tipo: 'scritto', data: ora.data, peso: 1,
    voti: [], allegati: [], recuperi: [], riconsegne: [] }
  const consegna = { ...(r.consegne[0] ?? {}), id: 'co1', corsoId: corso.id,
    testo: 'Porta il materiale', a: 'classe', tipo: 'compito', allieviIds: [],
    data: ora.data, dataLezioneId: 'l1', scadenza: null, scadenzaLezioneId: null,
    spunte: [], creataIl: piano.creatoIl, aggiornataIl: piano.aggiornatoIl }
  prova.vai({ pagina: 'pagina.corso.overview', soggetto: { tipo: 'corso', id: corso.id } },
    { altro: { registro: { ...r,
      lezioni: [{ ...ora, id: 'l1', pianoId: 'p1' },
        { ...ora, id: 'l2', data: '2026-10-03', pianoId: 'p1' }],
      piani: [piano, { ...piano, id: 'p2', attivita: [], risorse: [] }],
      progetti: [progetto, { ...progetto, id: 'estraneo', corsoId: 'altro', titolo: 'Altro corso' }],
      valutazioni: [momento], consegne: [consegna],
      check: [{ id: 'ch1', corsoId: corso.id, colonne: [
        { id: 'c1', titolo: 'Quaderno' }, { id: 'c2', titolo: 'Libretto' }], spunte: [],
        creatoIl: piano.creatoIl, aggiornatoIl: piano.aggiornatoIl }] } } })
}`

test('colonne, risorse condivise e collegamenti reali della progettazione', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PREPARA)
  await valuta(page, FRAME)

  await expect(page.locator('.panoramica__colonna')).toHaveCount(3)
  await expect(page.locator('.panoramica__progetto')).toHaveCount(1)
  await expect(page.getByText('Materiale del progetto', { exact: true })).toHaveAttribute(
    'href', 'https://example.com/materiale')
  await expect(page.locator('.panoramica__risorsa[data-nodo="file:materiali/scheda.pdf"]'))
    .toHaveCount(1)
  const prima = page.locator('[data-nodo="lezione:l1"]')
  const seconda = page.locator('[data-nodo="lezione:l2"]')
  await expect(prima).toContainText('Prova svolta')
  await expect(prima).not.toContainText('Valutazione prevista')
  await expect(seconda).toContainText('Valutazione prevista: Prova prevista')
  await expect(seconda).not.toContainText('Prova svolta')
  await expect(prima).toContainText('Porta il materiale')
  await expect(prima).toContainText('Quaderno')
  await expect(prima).toContainText('Libretto')
  await expect(prima).toContainText('Ponte · Preparazione')
  await expect(page.locator('.panoramica__filo--progetto')).toHaveCount(2)
  const schema = page.locator('.panoramica__schema')
  const sezioni = await schema.locator(':scope > section').evaluateAll((nodi) =>
    nodi.map((n) => ({ x: n.getBoundingClientRect().x, y: n.getBoundingClientRect().y })))
  expect(sezioni).toHaveLength(3)
  expect(sezioni[0].x).toBeLessThan(sezioni[1].x)
  expect(sezioni[1].x).toBeLessThan(sezioni[2].x)
  expect(Math.max(...sezioni.map((n) => n.y)) - Math.min(...sezioni.map((n) => n.y)))
    .toBeLessThan(1)
  const scalaIniziale = await schema.evaluate((n) => Number((n as HTMLElement).style.zoom))
  expect(scalaIniziale).toBe(1)
  await expect(page.getByRole('slider', { name: 'Zoom dello schema' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Adatta alla finestra' })).toHaveCount(0)
  await valuta(page, FRAME)
  await schermata(page, 'progettazione-overview.png', { fullPage: true })

  await prima.getByRole('button', { name: 'Lavoro in gruppo', exact: true }).focus()
  await expect(page.locator('.panoramica__filo--acceso')).not.toHaveCount(0)
  await prima.getByRole('button', { name: 'Scheda condivisa', exact: true }).last().click()
  const file = page.locator('.panoramica__risorsa[data-nodo="file:materiali/scheda.pdf"]')
  await expect(file.getByRole('button')).toBeFocused()
  await file.getByRole('button').click()
  await expect.poll(() => valuta(page,
    "richieste.filter(m => m.azione?.tipo === 'risorsa.apri').at(-1)?.azione.risorsaId"))
    .toBe('file1')

  await page.setViewportSize({ width: 1100, height: 800 })
  await valuta(page, FRAME)
  await expect(page.locator('.panoramica__filo').first()).toHaveAttribute('d', /^M /)
  await prima.getByRole('button', { name: 'Lavoro in gruppo', exact: true }).click()
  expect(await valuta(page, 'prova.stato.posto.pagina')).toBe('pagina.corso.piani')
  expect(await valuta(page, 'prova.stato.lezioneId')).toBe('l1')
  expect(errori).toEqual([])
})

test('un solo selettore del corso per registro e progettazione', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PREPARA)
  await valuta(page, FRAME)
  await expect(page.locator('[data-fuoco="sidebar-corso"]')).toHaveCount(1)
  await expect(page.getByRole('slider', { name: 'Zoom dello schema' })).toHaveCount(0)
  await expect(page.locator('[data-fuoco="barra-comandi-corso"]')).toHaveCount(1)
  await expect(page.locator('.sidebar__gruppo--anno')).toContainText('Anno scolastico')
  await expect(page.locator('.sidebar__gruppo--anno [data-fuoco="pagina.corso.progetti"]'))
    .toHaveCount(1)
  await expect(page.locator('.sidebar__gruppo--registro .sidebar__titolo-scelta')).toHaveCount(0)
  await expect(page.locator('.sidebar__gruppo--progettazione .sidebar__titolo-scelta')).toHaveCount(0)
  await page.locator('[data-fuoco="sidebar-corso"]').click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.locator('[role="menuitem"]:not([aria-current="page"])').first().click()
  await valuta(page, FRAME)
  expect(await valuta(page, 'prova.stato.posto.pagina')).toBe('pagina.corso.overview')
  await expect(page.locator('.panoramica__progetto')).toHaveCount(0)
  expect(errori).toEqual([])
})

test('le risorse seguono lo scorrimento e i collegamenti restano agganciati', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PREPARA)
  await valuta(page, `() => {
    const r = prova.stato.registro
    r.lezioni = Array.from({ length: 30 }, (_, i) => ({ ...r.lezioni[0], id: 'l' + i,
      data: '2026-10-' + String(i + 1).padStart(2, '0'), pianoId: i < 6 ? 'p1' : null }))
    prova.ridisegna()
  }`)
  await valuta(page, FRAME)
  await page.locator('.contenuto').evaluate((n) => { n.scrollTop = 600 })
  await valuta(page, FRAME)
  const risorse = page.locator('.panoramica__risorsa[data-nodo="file:materiali/scheda.pdf"]')
  await expect.poll(() => risorse.evaluate((n) => n.getBoundingClientRect().top))
    .toBeGreaterThan(0)
  const primaPosizione = await risorse.evaluate((n) => n.getBoundingClientRect().top)
  const linea = page.locator('.panoramica__filo--file').first()
  const percorso = await linea.getAttribute('d')
  await page.locator('.contenuto').evaluate((n) => { n.scrollTop = 1000 })
  await valuta(page, FRAME)
  const dopo = await risorse.evaluate((n) => n.getBoundingClientRect().top)
  expect(dopo).toBeGreaterThan(0)
  expect(dopo).toBeLessThanOrEqual(primaPosizione + 1)
  await expect(linea).not.toHaveAttribute('d', percorso!)
  await page.locator('.contenuto').evaluate((n) => { n.scrollTop = 1900 })
  await valuta(page, FRAME)
  const arresto = await risorse.evaluate((n) =>
    n.getBoundingClientRect().top + n.closest('.contenuto')!.scrollTop)
  await page.locator('.contenuto').evaluate((n) => { n.scrollTop = 2200 })
  await valuta(page, FRAME)
  expect(await risorse.evaluate((n) =>
    n.getBoundingClientRect().top + n.closest('.contenuto')!.scrollTop))
    .toBeCloseTo(arresto, 0)
  expect(errori).toEqual([])
})

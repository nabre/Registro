// Le matrici larghe: un clic non riporta lo scorrimento orizzontale a sinistra.
//
// L'appello, il check e la matrice dei corsi scorrono di lato quando le colonne
// non ci stanno. Il registro rifà l'albero a ogni cambio di stato (ADR-06): una
// presenza segnata, una spunta. Se la scatola che scorre è ricreata, chi era
// arrivato alle ultime unità didattiche torna alla prima a ogni clic. Qui si
// fissa che la scatola è lo stesso nodo prima e dopo il ridisegno (catena di
// `data-telaio` dalla radice della vista) e che lo scorrimento resta dov'era.
//
// Il ponte di prova risponde «fatto» e non riscrive il registro: il ritorno
// dell'host lo fa la prova, con un `aggiorna` del registro.

import { expect, test } from '@playwright/test'

import { FOTOGRAMMA, attendiRisposte, pannello, valuta, valutaSu } from './banco'

// Un'ora lunga (sedici unità didattiche) con tre persone: in una finestra
// stretta la matrice dell'appello scorre di lato.
const ORA_LUNGA = `() => {
  const r = prova.stato.registro
  const classe = r.classi[0]
  const allievi = [0, 1, 2].map((i) => ({ ...classe.allievi[0], id: \`al-\${i}\`, cognome: \`Prova\${i}\` }))
  const classi = r.classi.map((c) => c.id === classe.id ? { ...c, allievi } : c)
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const slot = [{ ...base.slot[0], inizio: '07:00', fine: '19:00' }]
  const lezione = { ...base, id: 'lez-lunga', slot }
  prova.aggiorna({ registro: { ...r, classi, lezioni: [...r.lezioni, lezione] } })
  prova.apriLezione('lez-lunga')
  prova.aggiorna({ schedaLezione: 'amministrazione' })
}`

// Il ritorno dell'host dopo il clic: il registro con la presenza cambiata.
const RITORNO = `() => {
  const r = prova.stato.registro
  const lezioni = r.lezioni.map((l) => l.id !== 'lez-lunga' ? l : {
    ...l, presenze: [{ allievoId: 'al-0', stati: Array(20).fill('presente'), minuti: 0, nota: '' }] })
  prova.aggiorna({ registro: { ...r, lezioni } })
}`

test('appello_resta_a_destra', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 620, altezza: 800 })
  await valuta(page, ORA_LUNGA)
  await valuta(page, FOTOGRAMMA)

  const telaio = page.locator('.appello__telaio')
  expect(await telaio.count(), 'la matrice dell\'appello non c\'è').toBe(1)
  const larga = await valutaSu<number>(telaio, '(el) => el.scrollWidth - el.clientWidth')
  expect(larga, 'la matrice non scorre di lato: la prova non direbbe niente').toBeGreaterThan(100)

  await valutaSu(telaio, '(el) => { el.scrollLeft = el.scrollWidth; window.__appello = el }')

  // Un clic di presenza sull'ultima unità, che a destra si vede già, poi il
  // ritorno dell'host.
  await page.locator('[data-fuoco="ud-al-0-15"]').click()
  await attendiRisposte(page)
  const sinistra = await valutaSu<number>(telaio, '(el) => el.scrollLeft')
  expect(sinistra, 'la matrice non è scorsa a destra').toBeGreaterThan(100)
  await valuta(page, RITORNO)
  await valuta(page, FOTOGRAMMA)

  expect(await valutaSu(telaio, '(el) => el === window.__appello'), 'la matrice è un nodo nuovo dopo il ridisegno')
    .toBeTruthy()
  const dopo = await valutaSu<number>(telaio, '(el) => el.scrollLeft')
  expect(dopo, 'lo scorrimento orizzontale è tornato indietro').toBe(sinistra)
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

// Il check del primo corso con sedici colonne: in una finestra stretta scorre.
const CHECK_LARGO = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const colonne = Array.from({ length: 16 }, (_, i) => ({ id: \`c\${i}\`, titolo: \`Colonna \${i}\` }))
  const check = { id: 'chk-largo', corsoId: corso.id, colonne, spunte: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  prova.aggiorna({ registro: { ...r, check: [check] } })
  prova.vai({ pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corso.id } })
}`

const CHECK_RITORNO = `(allievoId) => {
  const r = prova.stato.registro
  const check = r.check.map((c) => ({ ...c, spunte: [{ allievoId, colonnaId: 'c15', lezioneId: null,
    data: '2026-09-14', fattaIl: '2026-09-14T08:00:00.000Z' }] }))
  prova.aggiorna({ registro: { ...r, check } })
}`

test('check_resta_a_destra', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 620, altezza: 800 })
  await valuta(page, CHECK_LARGO)
  await valuta(page, FOTOGRAMMA)
  const allievo = await valuta<string>(page, 'prova.stato.registro.classi[0].allievi[0].id')

  const telaio = page.locator('.vista--check .check__telaio')
  expect(await telaio.count(), 'la griglia del check manca').toBe(1)
  expect(await valutaSu<number>(telaio, '(el) => el.scrollWidth - el.clientWidth'), 'il check non scorre di lato')
    .toBeGreaterThan(100)
  await valutaSu(telaio, '(el) => { el.scrollLeft = el.scrollWidth; window.__check = el }')

  await page.locator(`[data-fuoco="check-${allievo}-c15"]`).click()
  await attendiRisposte(page)
  const sinistra = await valutaSu<number>(telaio, '(el) => el.scrollLeft')
  expect(sinistra, 'il check non è scorso a destra').toBeGreaterThan(100)
  await valuta(page, CHECK_RITORNO, allievo)
  await valuta(page, FOTOGRAMMA)

  expect(await valutaSu(telaio, '(el) => el === window.__check'), 'la griglia è un nodo nuovo dopo il ridisegno')
    .toBeTruthy()
  const dopo = await valutaSu<number>(telaio, '(el) => el.scrollLeft')
  expect(dopo, 'il check è tornato indietro').toBe(sinistra)
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

// Quattordici classi in più: la matrice dei corsi è più larga della finestra.
const CORSI_LARGHI = `() => {
  const r = prova.stato.registro
  const modello = r.classi[1]
  const altre = Array.from({ length: 14 }, (_, i) => ({ ...modello, id: \`cl-\${i}\`, nome: \`Z\${String(i).padStart(2, '0')}\`,
    allievi: [], docenteDiClasse: false }))
  prova.aggiorna({ registro: { ...r, classi: [...r.classi, ...altre] } })
  prova.vai({ pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id: r.corsi[0].id } })
}`

// Il ritorno dell'host dopo «accendi»: il corso nuovo all'incrocio.
const CORSI_RITORNO = `() => {
  const r = prova.stato.registro
  const corso = { ...r.corsi[0], id: 'corso-nuovo', classeId: 'cl-13', titolo: 'Z13 · Matematica' }
  prova.aggiorna({ registro: { ...r, corsi: [...r.corsi, corso] } })
}`

test('corsi_restano_a_destra', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { larghezza: 620, altezza: 800 })
  await valuta(page, CORSI_LARGHI)
  await valuta(page, FOTOGRAMMA)
  const materia = await valuta<string>(page, 'prova.stato.registro.corsi[0].materiaId')

  const telaio = page.locator('.matrice-corsi')
  expect(await telaio.count(), 'la matrice dei corsi manca').toBe(1)
  expect(await valutaSu<number>(telaio, '(el) => el.scrollWidth - el.clientWidth'), 'la matrice non scorre di lato')
    .toBeGreaterThan(100)
  await valutaSu(telaio, '(el) => { el.scrollLeft = el.scrollWidth; window.__corsi = el }')

  await page.locator(`[data-fuoco="corso-cl-13-${materia}"]`).click()
  await attendiRisposte(page)
  const sinistra = await valutaSu<number>(telaio, '(el) => el.scrollLeft')
  expect(sinistra, 'la matrice non è scorsa a destra').toBeGreaterThan(100)
  await valuta(page, CORSI_RITORNO)
  await valuta(page, FOTOGRAMMA)

  expect(await valutaSu(telaio, '(el) => el === window.__corsi'), 'la matrice è un nodo nuovo dopo il ridisegno')
    .toBeTruthy()
  const dopo = await valutaSu<number>(telaio, '(el) => el.scrollLeft')
  expect(dopo, 'la matrice è tornata indietro').toBe(sinistra)
  expect(errori, 'errori JS').toEqual([])
  await page.close()
})

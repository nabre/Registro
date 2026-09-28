// Le tabelle lunghe si misurano, non si indovinano (ADR-50, passo 5).
//
// @tanstack/virtual-core entra «solo dove una misura dice che una tabella è
// lenta». Qui la misura: tre tabelle con dati grandi ma possibili — voti di
// quaranta persone su duecento prove, un archivio di cinquemila fogli, mille
// persone nell'elenco — e per ciascuna il primo disegno (si arriva sulla
// pagina) e un ridisegno (il registro torna dall'host con un dato cambiato).
//
// Il tempo è il lavoro: il gesto, poi script, stile e impaginazione del
// fotogramma che disegna (vedi ). Soglie: 200 ms il primo disegno,
// 50 ms un ridisegno, il limite di un compito lungo per Chromium. Se una
// tabella le passa, la prova cade: è il segnale per virtualizzarla, non per
// alzare la soglia.
//
// Ogni misura si ripete e si tiene la mediana: la prima volta paga anche la
// compilazione del codice, e un solo campione su una macchina di CI è rumore.
// `MISURE=1` stampa i numeri.

import { expect, test, type Page } from '@playwright/test'

import { pannello, valuta } from './banco'

const PRIMO_DISEGNO_MS = 200
const RIDISEGNO_MS = 50
const RIPETIZIONI = 5

interface Misura { ms: number, lungo: number }

/**
 * Esegue `window.__gesto` e misura il lavoro del disegno, non l'attesa del
 * fotogramma: il gesto stesso, poi dal primo callback del fotogramma (messo
 * prima del gesto, gira prima del disegno di `main.ts`) a dopo l'impaginazione
 * forzata nell'ultimo (messo dopo il gesto, gira dopo il disegno). Resta fuori
 * la pittura; contando fino al fotogramma dopo, ogni misura avrebbe un
 * pavimento di 17–33 ms di sola attesa. Torna anche il compito lungo più lungo.
 */
async function misura (page: Page): Promise<Misura> {
  return await page.evaluate(async () => {
    const lunghi: number[] = []
    const osservatore = new PerformanceObserver((elenco) => {
      for (const voce of elenco.getEntries()) lunghi.push(voce.duration)
    })
    osservatore.observe({ type: 'longtask' })
    let primo = 0
    const prima = new Promise<void>((fatto) => requestAnimationFrame(() => { primo = performance.now(); fatto() }))
    const inizio = performance.now()
    ;(window as unknown as { __gesto: () => void }).__gesto()
    const gesto = performance.now() - inizio
    const ultimo = await new Promise<number>((fatto) => requestAnimationFrame(() => {
      void document.body.offsetHeight
      fatto(performance.now())
    }))
    await prima
    // I compiti lunghi arrivano all'osservatore dopo: un giro del ciclo.
    await new Promise((fatto) => setTimeout(fatto, 0))
    osservatore.disconnect()
    return { ms: gesto + ultimo - primo, lungo: Math.max(0, ...lunghi) }
  })
}

function mediana (valori: number[]): number {
  const ordinati = [...valori].sort((a, b) => a - b)
  return ordinati[Math.floor(ordinati.length / 2)]
}

/** Ripete `prepara` + gesto misurato e torna le mediane. */
async function ripeti (page: Page, prepara: string, gesto: string): Promise<Misura> {
  const campioni: Misura[] = []
  for (let n = 0; n < RIPETIZIONI; n += 1) {
    await valuta(page, prepara)
    await valuta(page, '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    await valuta(page, `() => { window.__gesto = ${gesto} }`)
    campioni.push(await misura(page))
  }
  return { ms: mediana(campioni.map((c) => c.ms)), lungo: mediana(campioni.map((c) => c.lungo)) }
}

function stampa (nome: string, primo: Misura, ridisegno: Misura): void {
  if (!process.env.MISURE) return
  const f = (m: Misura) => `${m.ms.toFixed(0)} ms (compito lungo ${m.lungo.toFixed(0)} ms)`
  process.stdout.write(`${nome}: primo disegno ${f(primo)}, ridisegno ${f(ridisegno)}\n`)
}

// Quaranta persone nella prima classe: le tre tabelle le leggono tutte.
const QUARANTA = `(r) => {
  const classe = r.classi[0]
  const modello = classe.allievi[0]
  classe.allievi = Array.from({ length: 40 }, (_, i) => ({ ...modello, id: \`al-\${i}\`,
    cognome: \`Cognome\${String(i).padStart(2, '0')}\`, nome: \`Nome\${i}\`, azienda: \`Azienda \${i % 7}\` }))
  return classe
}`

// Duecento prove nel primo semestre, un voto a testa (qualche buco, qualche assente).
const VOTI = `() => {
  const r = structuredClone(prova.stato.registro)
  const classe = (${QUARANTA})(r)
  const corso = r.corsi.find((c) => c.classeId === classe.id)
  const scala = r.impostazioni.scala
  const passi = Math.round((scala.max - scala.min) / scala.passo) + 1
  const giorno = (j) => new Date(Date.UTC(2026, 8, 7) + Math.floor(j * 120 / 200) * 864e5).toISOString().slice(0, 10)
  r.valutazioni = Array.from({ length: 200 }, (_, j) => ({
    id: \`val-\${j}\`, corsoId: corso.id, lezioneId: null, pianoId: null, titolo: \`Prova \${j + 1}\`,
    tipo: 'scritto', data: giorno(j), peso: 1, scala: { ...scala }, descrizione: '', allegati: [],
    voti: classe.allievi.map((a, i) => ({ allievoId: a.id,
      valore: (i * 7 + j * 3) % 11 === 0 ? null : scala.min + ((i + j) % passi) * scala.passo,
      assente: (i + j) % 37 === 0 })),
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }))
  prova.aggiorna({ registro: r })
  prova.vai({ pagina: 'pagina.oggi' })
}`

// Centoventicinque richieste di documento, un foglio per persona: 5000 voci.
const ARCHIVIO = `() => {
  const r = structuredClone(prova.stato.registro)
  const classe = (${QUARANTA})(r)
  const corso = r.corsi.find((c) => c.classeId === classe.id)
  const modello = r.consegne.find((c) => c.corsoId === corso.id)
  const giorno = (j) => new Date(Date.UTC(2026, 8, 7) + Math.floor(j * 120 / 125) * 864e5).toISOString().slice(0, 10)
  const richieste = Array.from({ length: 125 }, (_, j) => ({ ...modello, id: \`cons-\${j}\`,
    testo: \`Certificato \${j + 1}\`, documento: 'certificato', data: giorno(j), docenteDiClasse: true,
    documenti: classe.allievi.map((a) => ({ allievoId: a.id, file: \`archivio/c\${j}/\${a.id}.pdf\`,
      nome: \`\${a.cognome}.pdf\`, aggiuntoIl: '2026-09-20T08:00:00.000Z' })),
    fatte: classe.allievi.filter((_, i) => (i + j) % 3 !== 0)
      .map((a) => ({ chi: a.id, fattaIl: '2026-09-20T08:00:00.000Z' })) }))
  r.consegne = [...r.consegne.filter((c) => c.id !== modello.id), ...richieste]
  prova.aggiorna({ registro: r })
  prova.vai({ pagina: 'pagina.oggi' })
}`

// Venticinque classi da quaranta: mille persone, tutte le classi aperte.
const PERSONE = `() => {
  const r = structuredClone(prova.stato.registro)
  const modello = r.classi[0]
  const allievo = modello.allievi[0]
  const classi = Array.from({ length: 25 }, (_, c) => ({ ...modello, id: \`cl-\${c}\`,
    nome: \`C\${String(c).padStart(2, '0')}\`, docenteDiClasse: false,
    allievi: Array.from({ length: 40 }, (_, i) => ({ ...allievo, id: \`p-\${c}-\${i}\`,
      cognome: \`Cognome\${i}\`, nome: \`Nome\${c}\`, azienda: \`Azienda \${i % 13}\` })) }))
  r.classi = [...r.classi, ...classi]
  prova.aggiorna({ registro: r, classiApertePersone: classi.map((c) => c.id) })
  prova.vai({ pagina: 'pagina.oggi' })
}`

// Il ritorno dall'host: lo stesso registro con un dato cambiato nella tabella.
const VOTO_CAMBIATO = `() => {
  const r = prova.stato.registro
  const valutazioni = r.valutazioni.map((v, j) => j !== 100 ? v
    : { ...v, voti: v.voti.map((x, i) => i !== 20 ? x : { ...x, valore: x.valore === 5 ? 4 : 5 }) })
  prova.aggiorna({ registro: { ...r, valutazioni } })
}`

const SPUNTA_CAMBIATA = `() => {
  const r = prova.stato.registro
  const consegne = r.consegne.map((c) => c.id !== 'cons-60' ? c
    : { ...c, fatte: c.fatte.some((f) => f.chi === 'al-0') ? c.fatte.filter((f) => f.chi !== 'al-0')
      : [...c.fatte, { chi: 'al-0', fattaIl: '2026-09-21T08:00:00.000Z' }] })
  prova.aggiorna({ registro: { ...r, consegne } })
}`

const NOME_CAMBIATO = `() => {
  const r = prova.stato.registro
  const classi = r.classi.map((c) => c.id !== 'cl-12' ? c
    : { ...c, allievi: c.allievi.map((a, i) => i !== 5 ? a : { ...a, nome: a.nome === 'Bis' ? 'Nome12' : 'Bis' }) })
  prova.aggiorna({ registro: { ...r, classi } })
}`

test('voti_40x200', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, VOTI)
  const corso = await valuta<string>(page, 'prova.stato.registro.corsi[0].id')
  const primo = await ripeti(page, "() => prova.vai({ pagina: 'pagina.oggi' })",
    `() => prova.vai({ pagina: 'pagina.corso.valutazioni', soggetto: { tipo: 'corso', id: '${corso}' } })`)
  // La misura dice qualcosa solo se la griglia è quella grande.
  await expect(page.locator('.tabella--voti input.cella-voto')).toHaveCount(40 * 200)
  const ridisegno = await ripeti(page, '() => {}', VOTO_CAMBIATO)
  stampa('voti 40×200', primo, ridisegno)
  expect(errori).toEqual([])
  expect(primo.ms, 'primo disegno dei voti').toBeLessThan(PRIMO_DISEGNO_MS)
  expect(ridisegno.ms, 'ridisegno dei voti').toBeLessThan(RIDISEGNO_MS)
  await page.close()
})

test('archivio_5000', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, ARCHIVIO)
  const primo = await ripeti(page, "() => prova.vai({ pagina: 'pagina.oggi' })",
    "() => prova.vai({ pagina: 'pagina.classe.documenti' })")
  await expect(page.locator('.tabella--documenti tbody td.tabella__cella')).toHaveCount(5000)
  const ridisegno = await ripeti(page, '() => {}', SPUNTA_CAMBIATA)
  stampa('archivio 40×125', primo, ridisegno)
  expect(errori).toEqual([])
  expect(primo.ms, 'primo disegno dell’archivio').toBeLessThan(PRIMO_DISEGNO_MS)
  expect(ridisegno.ms, 'ridisegno dell’archivio').toBeLessThan(RIDISEGNO_MS)
  await page.close()
})

test('persone_1000', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PERSONE)
  const primo = await ripeti(page, "() => prova.vai({ pagina: 'pagina.oggi' })",
    "() => prova.vai({ pagina: 'pagina.persone' })")
  await expect(page.locator('.vista--persone .voce-laterale')).toHaveCount(1000)
  const ridisegno = await ripeti(page, '() => {}', NOME_CAMBIATO)
  stampa('persone 1000', primo, ridisegno)
  expect(errori).toEqual([])
  expect(primo.ms, 'primo disegno delle persone').toBeLessThan(PRIMO_DISEGNO_MS)
  expect(ridisegno.ms, 'ridisegno delle persone').toBeLessThan(RIDISEGNO_MS)
  await page.close()
})

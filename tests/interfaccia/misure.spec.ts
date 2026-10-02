// Le tabelle lunghe si misurano, non si indovinano (ADR-50, passo 5).
//
// @tanstack/virtual-core entra «solo dove una misura dice che una tabella è
// lenta». Qui la misura, con dati grandi ma possibili (`prova.datiGrandi`, in
// `tests/helpers/uiStartup.ts`): voti di quaranta persone su duecento prove,
// un archivio di cinquemila fogli, mille persone nell'elenco. Per ciascuna il
// primo disegno (si arriva sulla pagina) e un ridisegno (il registro torna
// dall'host con un dato cambiato, per la strada dei messaggi: a differenze, o
// intero con `REGISTRO_STATO_INTERO=1`, l'interruttore di `panel.ts`).
//
// Lenta vuol dire oltre 200 ms il primo disegno o 50 ms un ridisegno, il
// limite di un compito lungo per Chromium. Le tre tabelle lo erano, di secondi
// le due matrici, e ora si disegnano a finestra (`components/virtualList.ts`).
// Il ridisegno però rifà la pagina intera (ADR-06), e con quaranta righe la
// pagina costa già più di 50 ms anche con una tabella corta: la prova chiede
// allora che la tabella lunga costi quanto la stessa pagina con una corta, o
// stia sotto la soglia. Un confronto sulla stessa macchina regge anche su una
// CI più lenta; se cade, una tabella è tornata a disegnarsi intera.
//
// Ogni misura si ripete, a turno fra tabella lunga e corta, e si tiene il
// campione più rapido: il carico delle altre prove e la prima compilazione del
// codice aggiungono tempo, non ne tolgono, quindi il minimo è il costo del
// disegno e la mediana no. `MISURE=1` stampa i numeri.

import { expect, test, type Browser, type Page } from '@playwright/test'

import { FRAME, pannello, valuta } from './banco'

const PRIMO_DISEGNO_MS = 200
const RIDISEGNO_MS = 50
/**
 * Quanto la tabella lunga può costare più della corta. A finestra la lunga
 * costa già fino a due volte tanto (primo disegno dell'archivio, ridisegno
 * delle persone, misurati sotto il carico delle altre prove); una tabella
 * tornata a disegnarsi intera costa dieci volte tanto, non tre.
 */
const MARGINE = 3
const RIPETIZIONI = 7

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
    // I compiti lunghi arrivano all'osservatore più tardi, e con loro quel che
    // la finestra rifà dopo il disegno.
    await new Promise((fatto) => setTimeout(fatto, 100))
    osservatore.disconnect()
    return { ms: gesto + ultimo - primo, lungo: Math.max(0, ...lunghi) }
  })
}

/** Un campione: `prepara`, poi il gesto misurato. */
async function campione (page: Page, prepara: string, gesto: string): Promise<Misura> {
  await valuta(page, prepara)
  await valuta(page, FRAME)
  await valuta(page, `() => { window.__gesto = ${gesto} }`)
  return await misura(page)
}

/** Il campione più rapido, e il compito lungo più corto. */
function migliore (campioni: Misura[]): Misura {
  return { ms: Math.min(...campioni.map((c) => c.ms)), lungo: Math.min(...campioni.map((c) => c.lungo)) }
}

/**
 * Ripete il gesto sulla tabella lunga e sulla corta a turno e torna i
 * campioni migliori. A turno e non una serie dopo l'altra: sotto il carico delle altre
 * prove la macchina cambia passo da un secondo all'altro, e due serie misurate
 * in momenti diversi confronterebbero il carico invece delle tabelle.
 */
async function aTurno (
  lunga: Page, corta: Page, prepara: string, gesti: { lunga: string, corta: string },
): Promise<{ lunga: Misura, corta: Misura }> {
  const l: Misura[] = []
  const c: Misura[] = []
  for (let n = 0; n < RIPETIZIONI; n += 1) {
    l.push(await campione(lunga, prepara, gesti.lunga))
    c.push(await campione(corta, prepara, gesti.corta))
  }
  return { lunga: migliore(l), corta: migliore(c) }
}

interface Caso {
  /** I dati, da eseguire nella pagina. */
  dati: string
  /** Il gesto che porta sulla pagina della tabella. */
  vai: string
  /** Il ritorno dall'host con un dato cambiato. */
  ritorno: string
  /** Che la tabella sia davvero quella attesa: senza, la misura non dice niente. */
  controlla: (page: Page) => Promise<void>
}

/** Confronta la tabella lunga con la corta sulla stessa pagina, ciascuna in una scheda sua. */
async function confronta (browser: Browser, nome: string, lunga: Caso, corta: Caso): Promise<void> {
  const pl = await pannello(browser)
  const pc = await pannello(browser)
  if (process.env.REGISTRO_STATO_INTERO === '1') {
    for (const p of [pl, pc]) await valuta(p.page, '() => { prova.statoIntero = true }')
  }
  await valuta(pl.page, lunga.dati)
  await valuta(pc.page, corta.dati)
  const primo = await aTurno(pl.page, pc.page, "() => prova.vai({ pagina: 'pagina.oggi' })",
    { lunga: lunga.vai, corta: corta.vai })
  await lunga.controlla(pl.page)
  await corta.controlla(pc.page)
  const ridisegno = await aTurno(pl.page, pc.page, '() => {}', { lunga: lunga.ritorno, corta: corta.ritorno })
  expect(pl.errori).toEqual([])
  expect(pc.errori).toEqual([])
  await pl.page.close()
  await pc.page.close()
  const l = { primo: primo.lunga, ridisegno: ridisegno.lunga }
  const c = { primo: primo.corta, ridisegno: ridisegno.corta }
  if (process.env.MISURE) {
    const f = (m: Misura) => `${m.ms.toFixed(0)} ms (compito lungo ${m.lungo.toFixed(0)})`
    process.stdout.write(`${nome}: primo disegno ${f(l.primo)}, ridisegno ${f(l.ridisegno)}; ` +
      `corta: ${f(c.primo)}, ${f(c.ridisegno)}\n`)
  }
  expect(l.primo.ms, `primo disegno di ${nome}`)
    .toBeLessThan(Math.max(PRIMO_DISEGNO_MS, MARGINE * c.primo.ms))
  expect(l.ridisegno.ms, `ridisegno di ${nome}`)
    .toBeLessThan(Math.max(RIDISEGNO_MS, MARGINE * c.ridisegno.ms))
}

const VALUTAZIONI = "() => prova.vai({ pagina: 'pagina.corso.valutazioni', soggetto: { tipo: 'corso', " +
  'id: prova.stato.registro.corsi[0].id } })'

test('voti_40x200', async ({ browser }) => {
  const caso = (prove: number): Caso => ({
    dati: `prova.datiGrandi.voti(${prove})`,
    vai: VALUTAZIONI,
    ritorno: '() => prova.datiGrandi.votoCambiato()',
    controlla: async (page) => {
      await expect(page.locator('.tabella--voti tbody tr')).toHaveCount(40)
      await expect(page.locator('.tabella--voti thead th.tabella__momento').first()).toBeVisible()
    },
  })
  await confronta(browser, 'voti 40×200', caso(200), caso(10))
})

test('archivio_5000', async ({ browser }) => {
  const caso = (richieste: number): Caso => ({
    dati: `prova.datiGrandi.archivio(${richieste})`,
    vai: "() => prova.vai({ pagina: 'pagina.classe.documenti' })",
    ritorno: '() => prova.datiGrandi.spuntaCambiata()',
    controlla: async (page) => {
      await expect(page.locator('.tabella--documenti tbody tr')).toHaveCount(40)
      await expect(page.locator('.tabella--documenti thead th.tabella__richiesta').first()).toBeVisible()
    },
  })
  await confronta(browser, 'archivio 40×125', caso(125), caso(10))
})

test('persone_1000', async ({ browser }) => {
  const caso = (classi: number): Caso => ({
    dati: `prova.datiGrandi.persone(${classi})`,
    vai: "() => prova.vai({ pagina: 'pagina.persone' })",
    ritorno: '() => prova.datiGrandi.nomeCambiato()',
    controlla: async (page) => {
      await expect(page.locator('.vista--persone .voce-laterale').first()).toBeVisible()
    },
  })
  await confronta(browser, 'persone 1000', caso(25), caso(1))
})

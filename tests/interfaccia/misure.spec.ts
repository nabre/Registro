// Le tabelle lunghe si misurano, non si indovinano (ADR-50, passo 5).
//
// @tanstack/virtual-core entra «solo dove una misura dice che una tabella è
// lenta». Qui la misura, con dati grandi ma possibili (`prova.datiGrandi`, in
// `tests/helpers/uiStartup.ts`): voti di quaranta persone su duecento prove,
// un archivio di cinquemila fogli, mille persone nell'elenco. Per ciascuna il
// primo disegno (si arriva sulla pagina) e un ridisegno (il registro torna
// dall'host con un dato cambiato).
//
// Lenta vuol dire oltre 200 ms il primo disegno o 50 ms un ridisegno, il
// limite di un compito lungo per Chromium. Le tre tabelle lo erano, di secondi
// le due matrici, e ora si disegnano a finestra (`components/virtuale.ts`).
// Il ridisegno però rifà la pagina intera (ADR-06), e con quaranta righe la
// pagina costa già più di 50 ms anche con una tabella corta: la prova chiede
// allora che la tabella lunga costi quanto la stessa pagina con una corta, o
// stia sotto la soglia. Un confronto sulla stessa macchina regge anche su una
// CI più lenta; se cade, una tabella è tornata a disegnarsi intera.
//
// Ogni misura si ripete e si tiene la mediana: la prima volta paga anche la
// compilazione del codice, e un solo campione è rumore. `MISURE=1` stampa i
// numeri.

import { expect, test, type Browser, type Page } from '@playwright/test'

import { FRAME, pannello, valuta } from './banco'

const PRIMO_DISEGNO_MS = 200
const RIDISEGNO_MS = 50
/**
 * Quanto la tabella lunga può costare più della corta. Largo perché le prove
 * girano in parallelo e la macchina è condivisa: una tabella tornata a
 * disegnarsi intera costa dieci volte tanto, non due.
 */
const MARGINE = 2
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
    // I compiti lunghi arrivano all'osservatore più tardi, e con loro quel che
    // la finestra rifà dopo il disegno.
    await new Promise((fatto) => setTimeout(fatto, 100))
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
    await valuta(page, FRAME)
    await valuta(page, `() => { window.__gesto = ${gesto} }`)
    campioni.push(await misura(page))
  }
  return { ms: mediana(campioni.map((c) => c.ms)), lungo: mediana(campioni.map((c) => c.lungo)) }
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

/** Primo disegno e ridisegno di un caso, in una pagina sua. */
async function misuraCaso (browser: Browser, caso: Caso): Promise<{ primo: Misura, ridisegno: Misura }> {
  const { page, errori } = await pannello(browser)
  await valuta(page, caso.dati)
  const primo = await ripeti(page, "() => prova.vai({ pagina: 'pagina.oggi' })", caso.vai)
  await caso.controlla(page)
  const ridisegno = await ripeti(page, '() => {}', caso.ritorno)
  expect(errori).toEqual([])
  await page.close()
  return { primo, ridisegno }
}

/** Confronta la tabella lunga con la corta sulla stessa pagina. */
async function confronta (browser: Browser, nome: string, lunga: Caso, corta: Caso): Promise<void> {
  const l = await misuraCaso(browser, lunga)
  const c = await misuraCaso(browser, corta)
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

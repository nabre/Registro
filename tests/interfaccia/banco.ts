/**
 * Il banco delle prove dell'interfaccia: quel che ogni prova rifaceva uguale.
 *
 * La pagina con il pannello montato sui bundle di `node esbuild.mjs --ui`, il
 * ponte finto al posto di `acquireVsCodeApi`, la cartella delle fotografie.
 * Quel che cambia da prova a prova — i dati, i gesti, le misure — resta nel
 * suo file.
 *
 * Il codice che gira nella pagina resta scritto come testo, come nelle prove
 * Python da cui viene: `window.prova` è l'aggancio del bundle `ui` e non ha
 * tipi, e un testo si porta riga per riga senza reinventarne il senso.
 */

import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { Browser, BrowserContextOptions, Locator, Page } from '@playwright/test'

export const RADICE = resolve(__dirname, '..', '..')
export const BUNDLE = join(RADICE, 'dist-tests')
// Le fotografie stanno in una cartella loro, non mescolate ai bundle.
const SCHERMATE = process.env.SCATTI ?? join(BUNDLE, 'schermate')

const PAGINA = '<html lang="it"><body class="app"><div id="radice"></div></body></html>'
// Con il titolo: axe vuole un documento che si chiami in qualche modo.
export const PAGINA_CON_TITOLO = '<html lang="it"><head><title>Regiklass</title></head>' +
  '<body class="app"><div id="radice"></div></body></html>'

export const FRAME = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'
export const FOTOGRAMMA = '()=>new Promise(requestAnimationFrame)'

// La data di oggi come la calcola il registro: quella locale, non quella UTC.
export const OGGI = "(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');" +
  'return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()'

// L'ultima azione mandata di un tipo, o `null`.
export const ULTIMA = '(tipo) => richieste.filter(m=>m.azione?.tipo===tipo).map(m=>m.azione).at(-1) ?? null'

const RISPOSTA_OK = "{ tipo: 'risposta', id: m.id, ok: true }"

/**
 * Il finto `acquireVsCodeApi`: tiene quel che parte e risponde «fatto».
 *
 * - `richieste` e `tutte`: ogni messaggio mandato; le prove svuotano la prima,
 *   la seconda resta intera;
 * - `ricordato`: l'ultimo `setState`, quel che il pannello ricorderebbe;
 * - `inViaggio`: le richieste senza risposta, per aspettarle invece di dormire;
 * - `trattieni = true` tiene ferme le risposte, `rilascia()` ne manda una.
 *
 * `risposta` è l'espressione JavaScript della risposta a `m`;
 * `primaDiRispondere` gira nel giro della risposta, prima di lei.
 */
export function ponte (risposta = RISPOSTA_OK, primaDiRispondere = ''): string {
  return `(() => {
  window.richieste = []
  window.tutte = []
  window.ricordato = null
  window.inViaggio = 0
  window.trattieni = false
  window.trattenute = []
  const rispondi = (m) => {
    window.dispatchEvent(new MessageEvent('message', { data: ${risposta} }))
    window.inViaggio -= 1
  }
  window.rilascia = () => { const m = window.trattenute.shift(); if (m) rispondi(m) }
  window.acquireVsCodeApi = () => ({
    getState: () => null,
    setState: (s) => { window.ricordato = s },
    postMessage: (m) => {
      window.richieste.push(m)
      window.tutte.push(m)
      if (!m.id) return
      window.inViaggio += 1
      if (window.trattieni) { window.trattenute.push(m); return }
      setTimeout(() => { ${primaDiRispondere}; rispondi(m) }, 0)
    },
  })
})()`
}

/**
 * Valuta un testo come fa Playwright Python: se è una funzione la chiama con
 * `argomenti`, altrimenti ne torna il valore. Playwright per TypeScript tratta
 * ogni testo come espressione, e `'() => …'` tornerebbe la funzione intera,
 * non il suo risultato; un testo che non è un'espressione si esegue com'è. L'a capo prima della parentesi chiude un commento `//`
 * rimasto in coda.
 */
function eseguiTesto (dati: { codice: string, argomenti: unknown[] }): unknown {
  let valore: unknown
  try {
    valore = (0, eval)(`(${dati.codice}\n)`)
  } catch (errore) {
    // Più istruzioni in fila (`a = 0; b = true`): Python le accetta come
    // testo da eseguire, e così qui.
    if (!(errore instanceof SyntaxError)) throw errore
    valore = (0, eval)(dati.codice)
  }
  return typeof valore === 'function'
    ? (valore as (...a: unknown[]) => unknown)(...dati.argomenti)
    : valore
}

/** `page.evaluate` con il testo di una prova: funzione o espressione. */
export async function valuta<T = unknown> (page: Page, codice: string, arg?: unknown): Promise<T> {
  return await page.evaluate(eseguiTesto, { codice, argomenti: arg === undefined ? [] : [arg] }) as T
}

/** `locator.evaluate` con il testo di una prova: la funzione riceve l'elemento. */
export async function valutaSu<T = unknown> (
  chi: Locator, codice: string, arg?: unknown,
): Promise<T> {
  return await chi.evaluate((elemento, dati) => {
    const funzione = (0, eval)(`(${dati.codice}\n)`)
    return (funzione as (e: unknown, a: unknown) => unknown)(elemento, dati.arg)
  }, { codice, arg }) as T
}

/** `locator.evaluate_all` con il testo di una prova: la funzione riceve gli elementi. */
export async function valutaTutti<T = unknown> (
  chi: Locator, codice: string, arg?: unknown,
): Promise<T> {
  return await chi.evaluateAll((elementi, dati) => {
    const funzione = (0, eval)(`(${dati.codice}\n)`)
    return (funzione as (e: unknown, a: unknown) => unknown)(elementi, dati.arg)
  }, { codice, arg }) as T
}

/** `page.wait_for_function` con il testo di una prova: aspetta un valore vero. */
export async function attendi (
  page: Page, codice: string, arg?: unknown, opzioni: { timeout?: number } = {},
): Promise<void> {
  await page.waitForFunction(eseguiTesto, { codice, argomenti: arg === undefined ? [] : [arg] }, opzioni)
}

/** Il riquadro di un elemento che c'è: senza, la misura non ha senso e la prova cade. */
export async function riquadro (
  chi: Locator,
): Promise<{ x: number, y: number, width: number, height: number }> {
  const misura = await chi.boundingBox()
  if (!misura) throw new Error(`nessun riquadro per ${chi.toString()}`)
  return misura
}

export interface OpzioniPannello extends BrowserContextOptions {
  larghezza?: number
  altezza?: number
  html?: string
  ponteJs?: string
  lingua?: string
  bundle?: string
  prima?: (page: Page) => Promise<void>
}

/**
 * Una pagina nuova con il pannello montato: torna la pagina e i suoi errori JS.
 *
 * `lingua` arriva come in Electron, `window.registroLingua` prima di ogni
 * modulo; `prima(page)` gira prima del contenuto (orologio, rotte, console);
 * `bundle` sceglie la coppia `.css`/`.js` di `dist-tests/`; il resto va a
 * `newPage` (`colorScheme`, `reducedMotion`, …).
 */
export async function pannello (
  browser: Browser, opzioni: OpzioniPannello = {},
): Promise<{ page: Page, errori: string[] }> {
  const {
    larghezza = 1440, altezza = 1000, html = PAGINA, ponteJs, lingua, bundle = 'ui', prima,
    ...altre
  } = opzioni
  const page = await browser.newPage({ viewport: { width: larghezza, height: altezza }, ...altre })
  const errori: string[] = []
  page.on('pageerror', (e) => errori.push(String(e)))
  if (prima) await prima(page)
  await page.setContent(html)
  // Il `Temporal` nativo di Chromium non sente `page.clock`: tolto, il polyfill
  // del bundle di prova (`tests/helpers/temporal.mjs`) ripiega sul suo, che
  // legge `Date.now()`, e un orologio fermo ferma anche `oggi()`.
  await page.addScriptTag({ content: 'delete globalThis.Temporal' })
  if (lingua) await page.addScriptTag({ content: `window.registroLingua = '${lingua}'` })
  await page.addScriptTag({ content: ponteJs ?? ponte() })
  await page.addStyleTag({ path: join(BUNDLE, `${bundle}.css`) })
  await page.addScriptTag({ path: join(BUNDLE, `${bundle}.js`) })
  await page.waitForLoadState('networkidle')
  return { page, errori }
}

/** Aspetta che ogni richiesta mandata abbia avuto la sua risposta. */
export async function attendiRisposte (page: Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { inViaggio: number }).inViaggio === 0)
}

/** Fotografa una pagina o un elemento in `dist-tests/schermate/` (o in `SCATTI`). */
export async function schermata (
  chi: Page | Locator, nome: string, opzioni: Parameters<Page['screenshot']>[0] = {},
): Promise<void> {
  mkdirSync(SCHERMATE, { recursive: true })
  const path = join(SCHERMATE, nome)
  if ('goto' in chi) await chi.screenshot({ ...opzioni, path })
  else await chi.screenshot({ ...opzioni, fullPage: undefined, clip: undefined, path } as Parameters<Locator['screenshot']>[0])
}

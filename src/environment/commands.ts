// Comandi: una mappa di quelli registrati più i comandi fissi dell'apparato
// (cartella, apertura, schermo intero, zoom). Un comando sconosciuto non lancia,
// perché arriva spesso a fine di un'azione già riuscita.

import { BrowserWindow, clipboard, screen, shell } from 'electron'

import { limita } from '../domain/calculations.js'
import { Smaltitore } from './events.js'
import { Uri } from './uri.js'

type Comando = (...argomenti: never[]) => unknown

const registrati = new Map<string, Comando>()

export function registerCommand (nome: string, cosa: Comando): Smaltitore {
  registrati.set(nome, cosa)
  return new Smaltitore(() => {
    // Solo se è ancora il proprio: un comando ri-registrato (cambio di cartella
    // dei dati) non deve sparire alla chiusura del primo.
    if (registrati.get(nome) === cosa) registrati.delete(nome)
  })
}

/** Il primo argomento come `Uri`, che è la forma in cui il registro li passa tutti. */
function comeUri (argomento: unknown): Uri | null {
  return argomento instanceof Uri ? argomento : null
}

/** Lo schermo su cui mandare la proiezione: il secondario, se c'è. */
function schermoDellaClasse (): Electron.Display | null {
  const tutti = screen.getAllDisplays()
  if (tutti.length < 2) return null
  const principale = screen.getPrimaryDisplay()
  return tutti.find((schermo) => schermo.id !== principale.id) ?? null
}

/** La finestra dei `webContents` con quell'id (quello che conosce `windows.ts`), o `null`. */
function finestraDeiContenuti (id: number): BrowserWindow | null {
  const trovata = BrowserWindow.getAllWindows().find((finestra) => finestra.webContents.id === id)
  return trovata && !trovata.isDestroyed() ? trovata : null
}

/**
 * Manda a schermo intero, sullo schermo della classe, la finestra dei
 * `webContents` indicati (come fa `panels/projection.ts`), o senza argomento
 * quella col fuoco. Non si ripiega sul fuoco se la finestra nominata non c'è
 * più: su Windows il fuoco può essere ancora sul registro, che finirebbe
 * proiettato.
 */
function aSchermoIntero (idContenuti?: unknown): void {
  const nominata = typeof idContenuti === 'number' && Number.isFinite(idContenuti)
  const finestra = nominata ? finestraDeiContenuti(idContenuti) : BrowserWindow.getFocusedWindow()
  if (!finestra) return
  const schermo = schermoDellaClasse()
  // Prima si sposta, poi si allarga: a schermo intero non si cambia schermo.
  if (schermo) finestra.setBounds(schermo.workArea)
  finestra.setFullScreen(true)
}

/** I comandi della macchina, sempre disponibili senza registrazione. */
const dellApparato: Record<string, (...argomenti: unknown[]) => unknown> = {
  'apparato.mostraNellaCartella' (dove) {
    const uri = comeUri(dove)
    if (uri) shell.showItemInFolder(uri.fsPath)
  },

  'apparato.schermoIntero' (idContenuti) {
    aSchermoIntero(idContenuti)
  },

  'apparato.apri' (dove) {
    const uri = comeUri(dove)
    if (uri) void shell.openPath(uri.fsPath)
  },

  /**
   * Alterna lo schermo intero della finestra col fuoco, senza spostarla
   * (a differenza di `apparato.schermoIntero`).
   */
  'apparato.finestraIntera' () {
    const finestra = BrowserWindow.getFocusedWindow()
    if (finestra) finestra.setFullScreen(!finestra.isFullScreen())
  },

  /** Zoom a passi di Chromium (1.2 per scalino), fra metà e il doppio. */
  'apparato.zoom' (verso) {
    const finestra = BrowserWindow.getFocusedWindow()
    if (!finestra) return
    const contenuti = finestra.webContents
    if (verso === 'azzera') {
      contenuti.setZoomLevel(0)
      return
    }
    const passo = verso === 'indietro' ? -1 : 1
    contenuti.setZoomLevel(limita(contenuti.getZoomLevel() + passo, -4, 4))
  },
}

export async function executeCommand<T> (nome: string, ...argomenti: unknown[]): Promise<T> {
  const dellApp = registrati.get(nome)
  if (dellApp) return (await dellApp(...(argomenti as never[]))) as T

  const dellApparecchio = dellApparato[nome]
  if (dellApparecchio) return (await dellApparecchio(...argomenti)) as T

  // Un comando chiesto e non registrato è un pezzo che manca: lo si segnala.
  console.warn(`comando sconosciuto: ${nome}`)
  return undefined as T
}

// ------------------------------------------------------------------- l'esterno

/**
 * Gli unici schemi consegnati a `shell.openExternal`. Gli indirizzi arrivano
 * anche da piani lezione altrui, e su Windows certi schemi registrati dai
 * programmi eseguono comandi (es. `ms-msdt:`).
 */
const SCHEMI_AMMESSI = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/** Apre un indirizzo web nel browser. I file passano da `data/opening.ts`, non di qui. */
export function openExternal (uri: Uri): Promise<boolean> {
  const indirizzo = uri.toString()
  let schema: string
  try {
    schema = new URL(indirizzo).protocol.toLowerCase()
  } catch {
    return Promise.resolve(false)
  }
  if (!SCHEMI_AMMESSI.has(schema)) {
    console.warn(`indirizzo non aperto, schema non ammesso: ${schema}`)
    return Promise.resolve(false)
  }
  return shell.openExternal(indirizzo).then(
    () => true,
    () => false,
  )
}

/**
 * Gli appunti di sistema. Le chiamate di Electron tornano una promessa: si
 * aspetta, perché la copia sia finita e un errore arrivi a chi chiama.
 */
export const appunti = {
  async writeText (testo: string): Promise<void> {
    await clipboard.writeText(testo)
  },

  async readText (): Promise<string> {
    return await clipboard.readText()
  },
}

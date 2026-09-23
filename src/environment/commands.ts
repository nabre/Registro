// I comandi, che sul desktop sono una mappa e poco altro.
//
// `registerCommand` mette in una mappa, `executeCommand` cerca. La parte che
// conta sono i comandi che il registro *non* ha registrato e invoca lo stesso:
// quelli dell'apparato — mostrare un file nella sua cartella, aprirlo con il
// programma di sistema, mettere una finestra a schermo intero, ingrandire quel
// che si vede. Si contano su una mano, li si conosce a memoria, e ognuno ha
// qui il suo corpo.
//
// Un comando sconosciuto non fa cadere niente. Il registro lo invoca in mezzo a
// un'azione che sta portando a termine — `apparato.mostraNellaCartella` dopo
// aver esportato un CSV — e far fallire l'azione per una rifinitura vorrebbe
// dire perdere il lavoro fatto invece della sola rifinitura che manca.

import { BrowserWindow, clipboard, screen, shell } from 'electron'

import { limita } from '../domain/calculations.js'
import { Smaltitore } from './events.js'
import { Uri } from './uri.js'

type Comando = (...argomenti: never[]) => unknown

const registrati = new Map<string, Comando>()

export function registerCommand (nome: string, cosa: Comando): Smaltitore {
  registrati.set(nome, cosa)
  return new Smaltitore(() => {
    // Solo se è ancora il proprio: un comando ri-registrato — succede a ogni
    // cambio di cartella dei dati — non deve sparire quando si chiude il
    // primo.
    if (registrati.get(nome) === cosa) registrati.delete(nome)
  })
}

/** Il primo argomento come `Uri`, che è la forma in cui il registro li passa tutti. */
function comeUri (argomento: unknown): Uri | null {
  return argomento instanceof Uri ? argomento : null
}

/**
 * Lo schermo su cui mandare la proiezione: il secondario, se c'è.
 *
 * È la prima cosa che sul desktop diventa *migliore* e non solo diversa. Da
 * dentro VS Code non si poteva fare — un'estensione non sa quanti schermi ci
 * sono né dove stanno — e la si rimediava trascinando la finestra a mano una
 * volta per sempre. Qui si sa, e la finestra ci va da sé.
 */
function schermoDellaClasse (): Electron.Display | null {
  const tutti = screen.getAllDisplays()
  if (tutti.length < 2) return null
  const principale = screen.getPrimaryDisplay()
  return tutti.find((schermo) => schermo.id !== principale.id) ?? null
}

/**
 * La finestra a cui appartengono dei `webContents`, o `null` se non c'è più.
 *
 * Per l'id dei contenuti e non per quello della finestra: è quello che
 * `windows.ts` conosce già di ogni pannello, e con cui smista i messaggi.
 */
function finestraDeiContenuti (id: number): BrowserWindow | null {
  const trovata = BrowserWindow.getAllWindows().find((finestra) => finestra.webContents.id === id)
  return trovata && !trovata.isDestroyed() ? trovata : null
}

/**
 * Lo schermo intero, che il registro chiede con il comando di VS Code.
 *
 * Con l'id dei `webContents` agisce su quella finestra e su nessun'altra: è
 * quel che fa `panels/projection.ts`. Prima si fidava del fuoco — `reveal()`
 * sulla proiezione e un giro di eventi — ma su Windows il fuoco cambia quando
 * il sistema ha tempo, e se era ancora sul registro a finire a schermo intero
 * sul proiettore erano i voti e le note, davanti alla classe. Una finestra
 * nominata e sparita non si sostituisce con quella che ha il fuoco: meglio
 * niente che quella sbagliata.
 *
 * Senza argomento resta la regola di VS Code — la finestra che ha il fuoco —
 * per chi il comando lo chiede da una finestra che è già quella giusta.
 */
function aSchermoIntero (idContenuti?: unknown): void {
  const nominata = typeof idContenuti === 'number' && Number.isFinite(idContenuti)
  const finestra = nominata ? finestraDeiContenuti(idContenuti) : BrowserWindow.getFocusedWindow()
  if (!finestra) return
  const schermo = schermoDellaClasse()
  // Prima si sposta, poi si allarga: una finestra messa a schermo intero non
  // si sposta più su un altro schermo senza tornare indietro.
  if (schermo) finestra.setBounds(schermo.workArea)
  finestra.setFullScreen(true)
}

/**
 * I comandi che non sono del registro ma della macchina su cui sta: mostrare
 * un file nella sua cartella, aprirlo con il programma di sistema, mettere una
 * finestra a schermo intero, ingrandire quel che si vede.
 *
 * Si chiamavano `revealFileInOS`, `vscode.open` e `workbench.action.*`, che
 * erano i nomi dell'editor in cui il registro era nato. Li implementa questo
 * file e non li consuma nessun altro programma: portavano il nome di un
 * prodotto che non c'entra più, e adesso portano quello del loro ruolo.
 */
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
   * La finestra che ha il fuoco a schermo intero, e di nuovo indietro.
   *
   * Non è `apparato.schermoIntero`, e la differenza vale la seconda voce: quel
   * comando *manda* una finestra sullo schermo della classe, e per farlo la
   * sposta sul secondo monitor. Qui non si sposta niente — è la finestra di
   * chi insegna che si allarga su quello schermo su cui già sta.
   */
  'apparato.finestraIntera' () {
    const finestra = BrowserWindow.getFocusedWindow()
    if (finestra) finestra.setFullScreen(!finestra.isFullScreen())
  },

  /**
   * Lo zoom della finestra, di un passo per volta.
   *
   * I passi sono quelli di Chromium — 1.2 per scalino, come `Ctrl+` — e si
   * fermano a metà e al doppio: oltre, il registro non ci sta più in nessun
   * verso, e non c'è un gesto ovvio per tornare indietro se non si sa che
   * esiste «Dimensione normale».
   */
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

  // Sulla console e non in silenzio: un comando chiesto e non registrato è un
  // pezzo che manca, e si vuole sapere che qualcuno l'ha chiesto.
  console.warn(`comando sconosciuto: ${nome}`)
  return undefined as T
}

// ------------------------------------------------------------------- l'esterno

/**
 * Gli schemi che si consegnano al sistema, e nessun altro.
 *
 * `shell.openExternal` è una porta sul sistema operativo: su Windows apre
 * anche gli schemi registrati dai programmi installati, e alcuni di quelli
 * hanno fatto storia — `ms-msdt:` eseguiva comandi. Gli indirizzi che arrivano
 * qui non sono tutti scritti dal docente: stanno dentro i piani lezione, e i
 * piani lezione si scambiano fra colleghi come si scambia un file qualsiasi.
 *
 * Tre schemi coprono quel che serve davvero — una pagina, una mail, un numero
 * di telefono — e tutto il resto non passa.
 */
const SCHEMI_AMMESSI = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Gli indirizzi veri — un collegamento dentro un piano lezione, la pagina di
 * Microsoft — che vanno al browser. I *file* non passano di qui:
 * `data/opening.ts` spiega per esteso perché un percorso con dentro un grado
 * o un accento, consegnato come indirizzo, torna indietro come «file non
 * trovato».
 */
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
 * Gli appunti di sistema.
 *
 * Le due chiamate si aspettano, e non è cerimonia: da Electron 44 `writeText` e
 * `readText` tornano una promessa, sul modello di `navigator.clipboard`. Senza
 * `await` la copia si dichiarava finita prima di esserlo — chi la chiama va
 * avanti, mostra «copiato», e se la scrittura fallisce l'errore non arriva a
 * nessuno. Sono due righe che non si vedono finché la macchina non è lenta o gli
 * appunti non sono occupati da un altro programma, che è esattamente quando la
 * copia serve.
 */
export const appunti = {
  async writeText (testo: string): Promise<void> {
    await clipboard.writeText(testo)
  },

  async readText (): Promise<string> {
    return await clipboard.readText()
  },
}

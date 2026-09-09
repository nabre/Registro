// I comandi, che sul desktop sono una mappa e poco altro.
//
// `registerCommand` mette in una mappa, `executeCommand` cerca. La parte che
// conta sono i comandi che il registro *non* ha registrato e invoca lo stesso:
// quelli di VS Code. Sono cinque, li si conosce a memoria, e ognuno ha sul
// desktop un equivalente onesto — tranne uno, che qui non serve più.
//
// Un comando sconosciuto non fa cadere niente. Il registro lo invoca in mezzo a
// un'azione che sta portando a termine — `revealFileInOS` dopo aver esportato
// un CSV — e far fallire l'azione per un comando dell'editor vorrebbe dire
// perdere il lavoro fatto invece della sola rifinitura che manca.

import { BrowserWindow, clipboard, screen, shell } from 'electron'

import { Disposable } from './eventi.js'
import { Uri } from './uri.js'

type Comando = (...argomenti: never[]) => unknown

const registrati = new Map<string, Comando>()

export function registerCommand (nome: string, cosa: Comando): Disposable {
  registrati.set(nome, cosa)
  return new Disposable(() => {
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
 * Lo schermo intero, che il registro chiede con il comando di VS Code.
 *
 * Agisce sulla finestra che ha il fuoco, come fa VS Code, ed è esattamente
 * quel che serve: `pannelloProiezione.ts` chiama `reveal()` sulla proiezione
 * subito prima, proprio perché a mettersi a schermo intero non sia la finestra
 * di chi insegna.
 */
function aSchermoIntero (): void {
  const finestra = BrowserWindow.getFocusedWindow()
  if (!finestra) return
  const schermo = schermoDellaClasse()
  // Prima si sposta, poi si allarga: una finestra messa a schermo intero non
  // si sposta più su un altro schermo senza tornare indietro.
  if (schermo) finestra.setBounds(schermo.workArea)
  finestra.setFullScreen(true)
}

/** I comandi dell'editor che il registro invoca, e che qui hanno un altro corpo. */
const dellEditor: Record<string, (...argomenti: unknown[]) => unknown> = {
  revealFileInOS (dove) {
    const uri = comeUri(dove)
    if (uri) shell.showItemInFolder(uri.fsPath)
  },

  'workbench.action.toggleFullScreen' () {
    aSchermoIntero()
  },

  'vscode.open' (dove) {
    const uri = comeUri(dove)
    if (uri) void shell.openPath(uri.fsPath)
  },
}

export async function executeCommand<T> (nome: string, ...argomenti: unknown[]): Promise<T> {
  const dellApp = registrati.get(nome)
  if (dellApp) return (await dellApp(...(argomenti as never[]))) as T

  const dellEditore = dellEditor[nome]
  if (dellEditore) return (await dellEditore(...argomenti)) as T

  // Sulla console e non in silenzio: `workbench.action.openSettings` arriverà
  // con le impostazioni della fase 4, e finché non c'è si vuole sapere che
  // qualcuno l'ha chiesto.
  console.warn(`comando sconosciuto: ${nome}`)
  return undefined as T
}

// ------------------------------------------------------------------- l'esterno

/**
 * Gli indirizzi veri — un collegamento dentro un piano lezione, la pagina di
 * Microsoft — che vanno al browser. I *file* non passano di qui:
 * `dati/apertura.ts` spiega per esteso perché un percorso con dentro un grado
 * o un accento, consegnato come indirizzo, torna indietro come «file non
 * trovato».
 */
export function openExternal (uri: Uri): Promise<boolean> {
  return shell.openExternal(uri.toString()).then(
    () => true,
    () => false,
  )
}

export const appunti = {
  async writeText (testo: string): Promise<void> {
    clipboard.writeText(testo)
  },

  async readText (): Promise<string> {
    return clipboard.readText()
  },
}

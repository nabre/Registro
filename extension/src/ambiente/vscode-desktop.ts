// Il modulo `vscode` dell'applicazione desktop.
//
// Non è un adattatore che il registro chiama: è il modulo `vscode` stesso,
// sostituito da esbuild con un alias al momento della build. I ventisei file
// che scrivono `import * as vscode from 'vscode'` non sanno di stare girando
// altrove, e non devono saperlo: se una funzione del registro non va sul
// desktop, il difetto è qui dentro, non in chi chiama.
//
// Ogni voce di qui è una cosa che funziona. Non ci sono più forme inerti:
// l'albero laterale e la barra di stato dell'editor non esistono, e con loro
// non esiste quel che serviva a farli costruire a vuoto. Quel che manca non è
// mai `undefined`, perché un `undefined` si propaga per tre chiamate e poi
// scoppia lontano da dove è nato.

import { appunti, executeCommand, openExternal, registerCommand } from './comandi.js'
import { cartelleDiLavoro } from './contesto.js'
import {
  showErrorMessage,
  showInformationMessage,
  showInputBox,
  showOpenDialog,
  showQuickPick,
  showTextDocument,
  showWarningMessage,
  withProgress,
} from './dialoghi.js'
import { createWebviewPanel } from './finestre.js'
import { filesystem } from './fs.js'
import { getConfiguration, onDidChangeConfiguration } from './impostazioni.js'
import { createFileSystemWatcher } from './osservatore.js'

export { CancellationTokenSource, Disposable, EventEmitter } from './eventi.js'
export type { CancellationToken, Event, Smaltibile } from './eventi.js'

export { FileSystemError, FileType } from './fs.js'
export type { FileStat } from './fs.js'

export { ConfigurationTarget } from './impostazioni.js'
export type { ConfigurationChangeEvent, WorkspaceConfiguration } from './impostazioni.js'

export type { SecretStorage, SecretStorageChangeEvent } from './segreti.js'
export { Segreti } from './segreti.js'

export { ProgressLocation, ViewColumn } from './enumerazioni.js'

export { RelativePattern, Uri } from './uri.js'

export type { MessageItem, QuickPickItem } from './dialoghi.js'
export type { FileSystemWatcher } from './osservatore.js'

export type { ExtensionContext, WorkspaceFolder } from './contesto.js'
export type { Webview, WebviewPanel } from './finestre.js'

// Non è API di VS Code: serve alle prove dello shim, e alla fase 4 per
// accorgere l'applicazione di un'impostazione cambiata da un'altra finestra.
export { ricaricaImpostazioni } from './impostazioni.js'

// Nemmeno queste: sono le due domande che il protocollo `registro://` fa alle
// finestre — che HTML servire, e da quali cartelle è lecito leggere. Il guscio
// se le prende da `finestre.js`; qui stanno perché le prove possano verificare
// che l'HTML memorizzato e le radici concesse siano quel che si crede.
export { htmlDellaPagina, radiciConcesse } from './finestre.js'

// Nemmeno questa: è dove sta il worker di pdfjs, che il guscio ridichiara dopo
// `activate`. Sta qui perché le prove possano verificare la sostituzione che ci
// vive dentro — `app.asar` in `app.asar.unpacked` — senza impacchettare
// l'applicazione per scoprirla.
export { percorsoWorkerPdf } from './contesto.js'

// Nemmeno queste: sono i due pezzi di traduzione che le prove guardano da
// vicino — le graffe di un glob sciolte in due pattern, e i segnaposto delle
// icone tolti dalle etichette.
export { aEspressione, senzaGraffe } from './osservatore.js'
export { senzaSegnaposti } from './dialoghi.js'

// Nemmeno queste: sono il chiaro e lo scuro. Non sono API di nessun editor —
// il tema di un'applicazione lo decide l'applicazione — e stanno qui perché le
// prove possano verificare che l'impostazione `aspetto.tema` arrivi davvero a
// `nativeTheme`, che è il punto da cui si veste ogni finestra.
export { applicaTema, coloreSfondo, dimensioneTesto, osservaTema, preferenzeComuni, scuro } from './tema.js'

// ------------------------------------------------------------------------ workspace

export const workspace = {
  fs: filesystem,

  /**
   * La cartella di lavoro: quella scelta all'avvio e ricordata in
   * `impostazioni.json`. Finché non c'è, `radiceWorkspace()` in `percorsi.ts`
   * restituisce `null`, che è il caso «VS Code aperto su nessuna cartella» —
   * già previsto ovunque.
   */
  get workspaceFolders (): import('./contesto.js').WorkspaceFolder[] | undefined {
    return cartelleDiLavoro()
  },

  getConfiguration,
  onDidChangeConfiguration,

  createFileSystemWatcher,
}

// --------------------------------------------------------------------------- window

export const window = {
  createWebviewPanel,

  showInformationMessage,
  showWarningMessage,
  showErrorMessage,
  showInputBox,
  showQuickPick,
  showOpenDialog,
  showTextDocument,
  withProgress,
}

// ------------------------------------------------------------------------- commands

export const commands = {
  registerCommand,
  executeCommand,
}

// ------------------------------------------------------------------------------ env

export const env = {
  openExternal,
  clipboard: appunti,
}

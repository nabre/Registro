// L'apparato: quel che sta attorno al registro, sul desktop.
//
// Non è un adattatore che il registro chiama: è il modulo `apparato` stesso,
// sostituito da esbuild con un alias al momento della build. I trentun file
// che scrivono `import * as apparato from 'apparato'` non sanno di stare
// girando su Electron, e non devono saperlo: se una funzione del registro non
// va sul desktop, il difetto è qui dentro, non in chi chiama.
//
// Si chiamava `vscode`, ed era il nome di dove il registro era nato: un'
// estensione dell'editor. Da quando gira in una finestra sua quel nome diceva
// il falso — nominava un programma che non c'è più — e faceva credere che
// queste funzioni fossero l'API di qualcun altro invece del contratto fra il
// registro e la macchina su cui sta. `apparato` non nomina un prodotto: nomina
// un ruolo, e il ruolo non cambia se domani sotto c'è altro.
//
// Ogni voce di qui è una cosa che funziona. Non ci sono più forme inerti:
// l'albero laterale e la barra di stato dell'editor non esistono, e con loro
// non esiste quel che serviva a farli costruire a vuoto. Quel che manca non è
// mai `undefined`, perché un `undefined` si propaga per tre chiamate e poi
// scoppia lontano da dove è nato.

import { appunti, executeCommand, openExternal, registerCommand } from './commands.js'
import { cartelleDiLavoro as cartelleAperte } from './context.js'
import {
  showErrorMessage,
  showInformationMessage,
  showInputBox,
  showOpenDialog,
  showSaveDialog,
  showQuickPick,
  showTextDocument,
  showWarningMessage,
  withProgress,
} from './dialogs.js'
import { createWebviewPanel } from './windows.js'
import { filesystem } from './fs.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'
import { createFileSystemWatcher } from './watcher.js'

export { SorgenteAnnullamento, Smaltitore, EventEmitter } from './events.js'
export type { Annullamento, Event, Smaltibile } from './events.js'

export { ErroreFile, GenereFile } from './fs.js'

// Non è API di VS Code: `workspace.fs` conosce solo il file intero, e il
// documento d'anno si scrive per pezzi — vedi `data/package.ts`. Sta qui
// accanto al resto del file system perché è lì che si va a cercarla.
export { finisceCon, scriviDa } from './fs.js'
export type { StatoFile } from './fs.js'

export { AmbitoImpostazione } from './settings.js'
export type { CambioImpostazione, Configurazione } from './settings.js'

export type { DepositoSegreti, CambioSegreti } from './secrets.js'
export { Segreti } from './secrets.js'

export { DoveAvanzamento, ViewColumn } from './enumerations.js'

export { ModelloRelativo, Uri } from './uri.js'

export type { VoceMessaggio, VoceScelta } from './dialogs.js'
export type { Osservatore } from './watcher.js'

export type { ContestoApplicazione, CartellaDiLavoro } from './context.js'
export type { Webview, WebviewPanel } from './windows.js'

// Non è API di VS Code: serve alle prove dello shim, e alla fase 4 per
// accorgere l'applicazione di un'impostazione cambiata da un'altra finestra.
export { ricaricaImpostazioni } from './settings.js'

// Nemmeno queste: sono le due domande che il protocollo `registro://` fa alle
// finestre — che HTML servire, e da quali cartelle è lecito leggere. Il guscio
// se le prende da `finestre.js`; qui stanno perché le prove possano verificare
// che l'HTML memorizzato e le radici concesse siano quel che si crede.
export { htmlDellaPagina, radiciConcesse } from './windows.js'

// Nemmeno questa: è dove sta il worker di pdfjs, che il guscio ridichiara dopo
// `activate`. Sta qui perché le prove possano verificare la sostituzione che ci
// vive dentro — `app.asar` in `app.asar.unpacked` — senza impacchettare
// l'applicazione per scoprirla.
export { percorsoCaratteriPdf, percorsoWorkerPdf } from './context.js'

// Nemmeno questa: è la versione dell'applicazione, che `app.getVersion()` sa e
// il resto del registro no. La dichiara il condotto a chi chiama da fuori —
// due lati disallineati devono poterselo dire.
export { versioneApplicazione } from './context.js'

// Nemmeno queste: sono i due pezzi di traduzione che le prove guardano da
// vicino — le graffe di un glob sciolte in due pattern, e i segnaposto delle
// icone tolti dalle etichette.
export { aEspressione, senzaGraffe } from './watcher.js'
export { senzaSegnaposti } from './dialogs.js'

// Nemmeno queste: sono il chiaro e lo scuro. Non sono API di nessun editor —
// il tema di un'applicazione lo decide l'applicazione — e stanno qui perché le
// prove possano verificare che l'impostazione `aspetto.tema` arrivi davvero a
// `nativeTheme`, che è il punto da cui si veste ogni finestra.
export { applicaTema, coloreSfondo, dimensioneTesto, osservaTema, preferenzeComuni, scuro } from './theme.js'

// Nemmeno questa: è il percorso intero di un programma di Windows, perché un
// nome nudo Windows lo cerca prima nella cartella del documento aperto. Sta qui
// perché `data/` la raggiunga senza attraversare gli strati. Vedi `system.ts`.
export { diSistema } from './system.js'

// Da qui in giù: le capacità, raggruppate per quel che fanno.
//
// Si chiamavano `workspace`, `window`, `commands` ed `env`, che sono i nomi
// dell'API di VS Code. Erano nomi d'un altro programma appiccicati alle cose
// di questo — e uno di loro diceva anche il falso: di «workspace» qui non ce
// n'è nessuno, c'è una cartella di lavoro e ci sono delle impostazioni, che
// sono due cose diverse finite sotto lo stesso tetto perché in un editor
// stanno insieme.
//
// Quel che *non* si traduce, e non è una dimenticanza: `readFile`, `Uri`,
// `EventEmitter`, `Webview`. La regola è una sola — si traduce quel che nomina
// un prodotto o un'idea dell'editor, resta quel che nomina un'operazione che
// si chiama così dappertutto.

// -------------------------------------------------------------------------- i file

/** Il disco, come lo si legge e lo si scrive. */
export const file = filesystem

/**
 * La cartella di lavoro: quella scelta all'avvio e ricordata in
 * `impostazioni.json`. Finché non c'è torna `undefined`, che è il caso «nessuna
 * cartella aperta» — già previsto ovunque.
 */
export function cartelleDiLavoro (): import('./context.js').CartellaDiLavoro[] | undefined {
  return cartelleAperte()
}

/** Sta a guardare una cartella e dice quando qualcosa lì dentro cambia. */
export const osserva = createFileSystemWatcher

// ------------------------------------------------------------------ le impostazioni

export const impostazioni = {
  leggi: getConfiguration,
  alCambio: onDidChangeConfiguration,
}

// --------------------------------------------------------------------- le finestre

export const finestre = {
  crea: createWebviewPanel,
}

/**
 * Quel che si chiede a chi sta davanti allo schermo, e quel che gli si dice.
 *
 * I verbi sono quelli che si userebbero a voce — «informa», «avvisa»,
 * «chiedi» — perché è così che si legge il punto in cui si usano: una riga in
 * mezzo a un'azione, non una chiamata di sistema.
 */
export const dialoghi = {
  informa: showInformationMessage,
  avvisa: showWarningMessage,
  errore: showErrorMessage,
  chiediTesto: showInputBox,
  chiediScelta: showQuickPick,
  chiediFile: showOpenDialog,
  chiediDoveSalvare: showSaveDialog,
  apriDocumento: showTextDocument,
  conAvanzamento: withProgress,
}

// ---------------------------------------------------------------------- i comandi

export const comandi = {
  registra: registerCommand,
  esegui: executeCommand,
}

// ----------------------------------------------------------------------- l'esterno

/** Quel che esce dall'applicazione e va al sistema operativo. */
export const esterno = {
  apri: openExternal,
  appunti,
}

// Il modulo `apparato`: il contratto fra il registro e la macchina. esbuild lo
// sostituisce con un alias, così chi scrive `import * as apparato from
// 'apparato'` non sa di girare su Electron; se qualcosa non va sul desktop, il
// difetto è qui. Ogni voce funziona davvero: niente forme inerti né `undefined`.

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
import {
  alCambioAggiornamenti,
  controllaAggiornamenti,
  installaAggiornamento,
  scaricaAggiornamento,
  statoAggiornamenti,
} from './updates.js'

export { Smaltitore, EventEmitter } from './events.js'
export type { Event, Smaltibile } from './events.js'

export { ErroreFile, GenereFile } from './fs.js'

// Scrittura per pezzi del documento d'anno (vedi `data/package.ts`).
export { finisceCon, scriviDa } from './fs.js'
export type { StatoFile } from './fs.js'

export { AmbitoImpostazione } from './settings.js'
export type { CambioImpostazione, Configurazione } from './settings.js'

export type { DepositoSegreti, CambioSegreti } from './secrets.js'
export { Segreti } from './secrets.js'

export { ViewColumn } from './enumerations.js'

export { ModelloRelativo, Uri } from './uri.js'

export type { VoceMessaggio, VoceScelta } from './dialogs.js'
export type { Osservatore } from './watcher.js'

export type { ContestoApplicazione, CartellaDiLavoro } from './context.js'
export type { Webview, WebviewPanel } from './windows.js'

// Per le prove e per vedere un'impostazione cambiata da un'altra finestra.
export { ricaricaImpostazioni } from './settings.js'

// Le due domande del protocollo `registro://` (che HTML servire, da quali
// cartelle leggere), esposte per le prove.
export { htmlDellaPagina, radiciConcesse } from './windows.js'

// Percorsi di pdfjs, esposti perché le prove verifichino il passaggio
// `app.asar` → `app.asar.unpacked` senza impacchettare.
export { percorsoCaratteriPdf, percorsoWorkerPdf } from './context.js'

// La versione dell'applicazione, che il condotto dichiara a chi chiama da fuori.
export { versioneApplicazione } from './context.js'

// Esposti per le prove: graffe dei glob e segnaposto delle icone.
export { aEspressione, senzaGraffe } from './watcher.js'
export { senzaSegnaposti } from './dialogs.js'

// Il tema, esposto perché le prove verifichino che `aspetto.tema` arrivi a `nativeTheme`.
export { applicaTema, coloreSfondo, dimensioneTesto, osservaTema, preferenzeComuni, scuro } from './theme.js'

// Percorso intero di un programma di Windows (vedi `system.ts`), esposto a `data/`.
export { diSistema } from './system.js'

// Da qui in giù: le capacità, raggruppate per quel che fanno. I nomi di uso
// universale (`readFile`, `Uri`, `EventEmitter`, `Webview`) restano in inglese.

// -------------------------------------------------------------------------- i file

/** Il disco, come lo si legge e lo si scrive. */
export const file = filesystem

/** La cartella di lavoro scelta all'avvio, o `undefined` se nessuna è aperta. */
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

/** Messaggi e domande a chi usa il programma. */
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

// ---------------------------------------------------------------- gli aggiornamenti

/**
 * Stato e gesti degli aggiornamenti. I controlli a tempo li avvia il guscio
 * (`avviaAggiornamenti`), perché valgono anche senza documento aperto.
 */
export const aggiornamenti = {
  stato: statoAggiornamenti,
  alCambio: alCambioAggiornamenti,
  controlla: controllaAggiornamenti,
  scarica: scaricaAggiornamento,
  installa: installaAggiornamento,
}

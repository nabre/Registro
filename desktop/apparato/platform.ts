// Il modulo `apparato`: il contratto fra il registro e la macchina.
// `desktop/apparato/platform.ts` impianta le capacità di Electron nell'apparato.

import { impianta, type Impianto, Uri } from '../../core/apparato/platform.js'

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
import { filesystem, finisceCon, scriviDa } from './fs.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'
import { createFileSystemWatcher } from './watcher.js'
import {
  alCambioAggiornamenti,
  controllaAggiornamenti,
  installaAggiornamento,
  nascondiNotizia,
  scaricaAggiornamento,
  statoAggiornamenti,
} from './updates.js'
import { dimenticaDocumento, impostaPreferito } from './documents.js'
import { htmlDellaPagina, radiciConcesse } from './windows.js'
import { percorsoCaratteriPdf, percorsoWorkerPdf, versioneApplicazione } from './context.js'
import { aEspressione, senzaGraffe } from './watcher.js'
import { senzaSegnaposti } from './dialogs.js'
import { applicaTema, coloreSfondo, dimensioneTesto, osservaTema, preferenzeComuni, scuro } from './theme.js'
import { ricaricaImpostazioni } from './settings.js'
import { diSistema } from './system.js'

const impiantoElectron: Impianto = {
  file: filesystem,
  scriviDa,
  finisceCon,
  cartelleDiLavoro: cartelleAperte,
  osserva: createFileSystemWatcher,
  impostazioni: {
    leggi: getConfiguration,
    alCambio: (ascoltatore) => onDidChangeConfiguration(ascoltatore),
  },
  finestre: {
    crea: (tipo, titolo, colonna, opzioni) => createWebviewPanel(tipo, titolo, colonna, opzioni),
  },
  dialoghi: {
    informa: showInformationMessage,
    avvisa: showWarningMessage,
    errore: showErrorMessage,
    chiediTesto: showInputBox,
    chiediScelta: showQuickPick,
    chiediFile: showOpenDialog,
    chiediDoveSalvare: showSaveDialog,
    apriDocumento: showTextDocument,
    conAvanzamento: withProgress,
  },
  comandi: {
    registra: registerCommand,
    esegui: executeCommand,
  },
  esterno: {
    apri: (indirizzo: Uri | string) => openExternal(typeof indirizzo === 'string' ? Uri.parse(indirizzo) : indirizzo),
    appunti,
  },
  aggiornamenti: {
    stato: statoAggiornamenti,
    alCambio: (ascoltatore) => alCambioAggiornamenti(ascoltatore),
    controlla: controllaAggiornamenti,
    scarica: scaricaAggiornamento,
    installa: installaAggiornamento,
    nascondiNotizia,
  },
  documenti: {
    impostaPreferito,
    dimentica: dimenticaDocumento,
  },
  ricaricaImpostazioni,
  htmlDellaPagina,
  radiciConcesse,
  percorsoCaratteriPdf,
  percorsoWorkerPdf,
  versioneApplicazione,
  aEspressione,
  senzaGraffe,
  senzaSegnaposti,
  applicaTema,
  coloreSfondo,
  dimensioneTesto,
  osservaTema,
  preferenzeComuni,
  scuro,
  diSistema,
}

impianta(impiantoElectron)

export * from '../../core/apparato/platform.js'

export { AmbitoImpostazione } from './settings.js'
export type { CambioImpostazione, Configurazione } from './settings.js'
export type { DepositoSegreti, CambioSegreti } from './secrets.js'
export { Segreti } from './secrets.js'
export type { VoceMessaggio, VoceScelta } from './dialogs.js'
export type { Osservatore } from './watcher.js'
export type { ContestoApplicazione, CartellaDiLavoro } from './context.js'
export type { Webview, WebviewPanel } from './windows.js'
export { ricaricaImpostazioni } from './settings.js'
export { htmlDellaPagina, radiciConcesse } from './windows.js'
export { percorsoCaratteriPdf, percorsoWorkerPdf } from './context.js'
export { versioneApplicazione } from './context.js'
export { aEspressione, senzaGraffe } from './watcher.js'
export { senzaSegnaposti } from './dialogs.js'
export { applicaTema, coloreSfondo, dimensioneTesto, osservaTema, preferenzeComuni, scuro } from './theme.js'
export { diSistema } from './system.js'

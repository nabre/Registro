// Il registro che si accende da solo con il computer.
//
// Una riga di Electron — `app.setLoginItemSettings` — che scrive la voce di
// avvio automatico dove la scrive Windows (la chiave `Run` dell'utente). Qui
// intorno c'è solo il poco che serve a tenerla d'accordo con l'impostazione:
// scritta all'avvio, e riscritta quando l'impostazione cambia, perché una
// casella spuntata che non si traduce in niente è peggio di una casella che non
// c'è.
//
// ## Perché con un argomento
//
// Perché accendersi con il computer e *aprirsi* con il computer sono due cose
// diverse. Chi vuole il registro all'avvio vuole l'icona accanto all'orologio e
// il widget sul desktop, non una finestra grande in faccia appena finisce
// l'accesso: la finestra la aprirà lui, quando gli serve. `--avvio-silenzioso`
// è quel che distingue i due casi, e lo legge `src/startup.ts`.
//
// L'impostazione `avvio.soloVassoio` fa la stessa cosa a ogni avvio, anche
// lanciando l'applicazione a mano: sono due domande diverse — «parti con
// Windows?» e «parti senza finestra?» — e tenerle separate permette di volere
// l'una senza l'altra.

import { app } from 'electron'

import { Smaltitore } from './events.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'

const CHIAVE = 'registroDocenti.avvio.conWindows'

/** L'argomento con cui il registro si lancia da sé all'accesso. */
const AVVIO_SILENZIOSO = '--avvio-silenzioso'

/** Se questo avvio è quello automatico del sistema. */
export function avviatoDalSistema (): boolean {
  return process.argv.includes(AVVIO_SILENZIOSO)
}

/**
 * Mette o toglie il registro dall'avvio automatico, secondo l'impostazione.
 *
 * In sviluppo non si tocca niente: l'eseguibile è `electron.exe` dentro
 * `node_modules`, e registrarlo vorrebbe dire che a ogni accesso Windows prova
 * ad aprire un Electron nudo, sulla cartella di un progetto che magari non c'è
 * più. È il genere di residuo che poi nessuno collega più a niente.
 */
export function applicaAvvioConWindows (): void {
  if (!app.isPackaged) return
  const voluto = getConfiguration().get<boolean>(CHIAVE, false)
  const adesso = app.getLoginItemSettings(voceDiAvvio())
  if (adesso.openAtLogin === voluto) return
  app.setLoginItemSettings({ openAtLogin: voluto, ...voceDiAvvio() })
}

/** Toglie la voce d'avvio, quella scritta qui: per «Disinstalla…». */
export function togliAvvioConWindows (): void {
  app.setLoginItemSettings({ openAtLogin: false, ...voceDiAvvio() })
}

/**
 * Che cosa lanciare all'accesso.
 *
 * Nel portabile non è `process.execPath`, che è la copia estratta in `%TEMP%`
 * e sparisce a ogni chiusura: all'accesso dopo Windows avrebbe lanciato un
 * file che non c'è più. È l'`.exe` sulla chiavetta, che l'avviatore dice in
 * `PORTABLE_EXECUTABLE_FILE`. Installato — per tutti o per uno — il
 * predefinito di Electron è già l'eseguibile giusto.
 */
function voceDiAvvio (): { path?: string, args: string[] } {
  const portabile = process.env.PORTABLE_EXECUTABLE_FILE
  return portabile ? { path: portabile, args: [AVVIO_SILENZIOSO] } : { args: [AVVIO_SILENZIOSO] }
}

/** Tiene la voce d'avvio al passo con l'impostazione. */
export function osservaAvvioConWindows (): Smaltitore {
  return onDidChangeConfiguration((evento) => {
    if (evento.affectsConfiguration(CHIAVE)) applicaAvvioConWindows()
  })
}

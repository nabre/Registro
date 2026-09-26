// Avvio automatico con il sistema (`app.setLoginItemSettings`), tenuto
// d'accordo con l'impostazione all'avvio e a ogni cambio. La voce passa
// `--avvio-silenzioso`, che `src/startup.ts` legge per partire solo col
// vassoio; `avvio.soloVassoio` è un'impostazione distinta, valida sempre.

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
 * Mette o toglie il registro dall'avvio automatico. In sviluppo no, o si
 * registrerebbe l'`electron.exe` di `node_modules`.
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
 * Che cosa lanciare all'accesso. Nel portabile è `PORTABLE_EXECUTABLE_FILE`,
 * non `process.execPath` (copia temporanea in `%TEMP%`); installato, il
 * predefinito di Electron.
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

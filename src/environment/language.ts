// La lingua dell'applicazione, da `registroDocenti.aspetto.lingua` (`sistema`
// o una lingua di `src/i18n/languages.ts`). Le pagine la ricevono dal preload
// alla nascita (`CANALE_LINGUA`), quindi al cambio si ricaricano; nel main
// process cambia in memoria e menu e vassoio si rifanno con `alCambioLingua`.

import { app, ipcMain } from 'electron'

import { CANALE_LINGUA } from './channels.js'
import { ricaricaFinestre } from './dev.js'
import { Smaltitore } from './events.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'
import { impostaLingua, lingua, risolviLingua, SCELTA_SISTEMA } from '../i18n/index.js'

const CHIAVE = 'registroDocenti.aspetto.lingua'

/**
 * Le lingue di visualizzazione del sistema in ordine di preferenza (non il
 * formato regionale); in mancanza, quella di Chromium.
 */
function lingueDelSistema (): string[] {
  const preferite = app.getPreferredSystemLanguages()
  return preferite.length > 0 ? preferite : [app.getLocale()]
}

/** Applica l'impostazione al main process; all'avvio va chiamata prima di ogni finestra. */
export function applicaLingua (): void {
  const scelta = getConfiguration().get<string>(CHIAVE, SCELTA_SISTEMA)
  impostaLingua(risolviLingua(scelta, lingueDelSistema()))
}

/** Risponde in modo sincrono al preload, che deve sapere la lingua prima di disegnare. */
export function rispondiLingua (): void {
  ipcMain.on(CANALE_LINGUA, (evento) => {
    evento.returnValue = lingua()
  })
}

/**
 * Al cambio di lingua ricarica tutte le finestre; `dopo` rimanda il contenuto
 * alla proiezione, che non lo chiede da sé.
 */
export function osservaLingua (dopo: () => void = () => {}): Smaltitore {
  const iscrizione = onDidChangeConfiguration((evento) => {
    if (!evento.affectsConfiguration(CHIAVE)) return
    const prima = lingua()
    applicaLingua()
    if (lingua() !== prima) ricaricaFinestre(dopo)
  })
  return new Smaltitore(() => iscrizione.dispose())
}

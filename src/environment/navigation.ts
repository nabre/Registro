// Le vie di fuga di una finestra, chiuse tutte allo stesso modo.
//
// Una finestra del registro mostra sempre e soltanto la sua pagina. Ci sono
// però due modi per cui potrebbe finire a mostrare altro, e nessuno dei due
// passa dal codice dell'applicazione:
//
// - **la navigazione.** Un PDF trascinato dentro la finestra, per Chromium,
//   vuol dire «apri questo al posto della pagina»: il registro sparirebbe
//   dietro un lettore di PDF senza un modo ovvio di tornare indietro. Lo
//   stesso vale per un `location.href` che qualcuno riuscisse a far eseguire.
// - **la finestra figlia.** Un `target="_blank"` o un `window.open` apre una
//   finestra nuova che il registro non ha configurato: senza preload, senza le
//   sue preferenze, e — quel che conta — con i permessi che Chromium le dà di
//   suo invece di quelli che il registro avrebbe scelto.
//
// I collegamenti veri — la pagina di un ente, l'indirizzo dentro un piano
// lezione — non hanno bisogno di nessuna delle due: vanno al browser di
// sistema, e passano da `openExternal`, che filtra lo schema.
//
// Il motivo per cui sta in un modulo e non in ogni finestra: le finestre sono
// sei, in tre file diversi, e la guardia ne copriva due. Quelle scoperte non
// erano scoperte per scelta — erano scoperte perché la riga andava ricordata a
// mano ogni volta.

import type { BrowserWindow } from 'electron'

import { openExternal } from './commands.js'
import { Uri } from './uri.js'

/**
 * Chiude le due vie di fuga di una finestra: niente navigazione altrove,
 * niente finestre figlie.
 *
 * Un collegamento che chiedeva una finestra nuova non si perde: va al browser
 * di sistema, se lo schema è fra quelli ammessi.
 */
export function chiudiLeVieDiFuga (finestra: BrowserWindow): void {
  finestra.webContents.on('will-navigate', (evento, indirizzo) => {
    if (indirizzo !== finestra.webContents.getURL()) evento.preventDefault()
  })

  finestra.webContents.setWindowOpenHandler(({ url }) => {
    void openExternal(Uri.parse(url))
    return { action: 'deny' }
  })
}

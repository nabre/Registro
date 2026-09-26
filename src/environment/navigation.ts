// Una finestra mostra solo la sua pagina. Si bloccano la navigazione altrove
// (es. un PDF trascinato dentro) e le finestre figlie (`target="_blank"`,
// `window.open`), che nascerebbero senza preload né permessi scelti. I
// collegamenti vanno al browser via `openExternal`. Ogni finestra deve usarla.

import type { BrowserWindow } from 'electron'

import { openExternal } from './commands.js'
import { Uri } from './uri.js'

/** Blocca navigazione e finestre figlie; un collegamento in finestra nuova va al browser. */
export function chiudiLeVieDiFuga (finestra: BrowserWindow): void {
  finestra.webContents.on('will-navigate', (evento, indirizzo) => {
    if (indirizzo !== finestra.webContents.getURL()) evento.preventDefault()
  })

  finestra.webContents.setWindowOpenHandler(({ url }) => {
    void openExternal(Uri.parse(url))
    return { action: 'deny' }
  })
}

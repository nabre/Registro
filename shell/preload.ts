// Il preload: dà alle pagine `acquireVsCodeApi()` e ributta i messaggi del
// main process come eventi `message`, la forma che `src/ui/bridge.ts` ascolta.

import { contextBridge, ipcRenderer, webUtils } from 'electron'

import { CANALE, CANALE_INTERFACCIA, CANALE_LINGUA } from '../src/environment/channels.js'

// Ripristina le preferenze locali e salva subito ogni modifica, anche prima della chiusura.
let stato: unknown = ipcRenderer.sendSync(CANALE_INTERFACCIA, 'leggi')

/**
 * La lingua della pagina, letta una volta prima che disegni: `registroLingua`
 * sul `window`, raccolta da `src/i18n/page.ts`. Solo una stringa.
 */
contextBridge.exposeInMainWorld('registroLingua', ipcRenderer.sendSync(CANALE_LINGUA) as unknown)

contextBridge.exposeInMainWorld('acquireVsCodeApi', () => ({
  postMessage: (messaggio: unknown) => ipcRenderer.send(CANALE, messaggio),
  getState: () => stato,
  setState: (nuovo: unknown) => {
    stato = nuovo
    // `send` e non `sendSync`: il ritorno non serve, e `sendSync` bloccherebbe
    // il renderer durante le scritture sincrone di `src/environment/uiState.ts`,
    // a ogni `aggiorna()`. La lettura all'avvio resta sincrona: serve prima di disegnare.
    ipcRenderer.send(CANALE_INTERFACCIA, 'scrivi', nuovo)
  },
}))

/**
 * Il percorso sul disco di un file trascinato nella finestra (un `.gguf` sulla
 * sezione dei modelli): nel browser un file ha solo il contenuto, e passarne
 * gigabyte dalla pagina non ha senso. Torna solo una stringa; se sia un GGUF
 * vero lo decide `data/gguf.ts` nell'host.
 */
contextBridge.exposeInMainWorld('registroFile', {
  percorsoDi: (file: File): string => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      // Stringa vuota: la pagina rimanda al pulsante col dialogo di sistema.
      return ''
    }
  },
})

ipcRenderer.on(CANALE, (_evento, messaggio: unknown) => {
  window.postMessage(messaggio, '*')
})

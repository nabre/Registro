// Il preload: poche righe, ed è il ponte che tiene `src/webview/ponte.ts`
// intatto.
//
// Il webview del registro chiama `acquireVsCodeApi()` e poi ascolta gli eventi
// `message` della pagina. Qui si dà l'una e si rifanno gli altri: quel che
// arriva dal main process si ributta nella pagina come `message`, che è la
// forma che `ponte.ts` ascolta già e di cui non deve accorgersi di aver
// cambiato mondo.

import { contextBridge, ipcRenderer } from 'electron'

/** Lo stesso canale del main process. Vedi `src/ambiente/finestre.ts`. */
const CANALE = 'registro:messaggio'

// Lo stato che il pannello si conserva fra un ridisegno e l'altro. Vive quanto la finestra,
// che è quanto basta: `retainContextWhenHidden` sul desktop non ha senso —
// una finestra il suo contesto non lo perde mai.
let stato: unknown = null

contextBridge.exposeInMainWorld('acquireVsCodeApi', () => ({
  postMessage: (messaggio: unknown) => ipcRenderer.send(CANALE, messaggio),
  getState: () => stato,
  setState: (nuovo: unknown) => {
    stato = nuovo
  },
}))

ipcRenderer.on(CANALE, (_evento, messaggio: unknown) => {
  window.postMessage(messaggio, '*')
})

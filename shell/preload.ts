// Il preload: poche righe, ed è il ponte che tiene `src/ui/bridge.ts`
// intatto.
//
// Il webview del registro chiama `acquireVsCodeApi()` e poi ascolta gli eventi
// `message` della pagina. Qui si dà l'una e si rifanno gli altri: quel che
// arriva dal main process si ributta nella pagina come `message`, che è la
// forma che `bridge.ts` ascolta già e di cui non deve accorgersi di aver
// cambiato mondo.

import { contextBridge, ipcRenderer, webUtils } from 'electron'

/** Lo stesso canale del main process. Vedi `src/environment/windows.ts`. */
const CANALE = 'registro:messaggio'

// Ripristina le preferenze locali e salva subito ogni modifica, anche prima della chiusura.
let stato: unknown = ipcRenderer.sendSync('registro:interfaccia', 'leggi')

contextBridge.exposeInMainWorld('acquireVsCodeApi', () => ({
  postMessage: (messaggio: unknown) => ipcRenderer.send(CANALE, messaggio),
  getState: () => stato,
  setState: (nuovo: unknown) => {
    stato = nuovo
    // `send` e non `sendSync`: il valore di ritorno non lo legge nessuno —
    // `bridge.ts`, `scriviStatoPersistito`, lo butta — e con `sendSync` il
    // renderer restava **fermo** per tutta la durata di tre chiamate di sistema
    // nel main process (`mkdir`, `writeFile`, `rename`, tutte sincrone in
    // `src/environment/uiState.ts`). Succedeva a ogni `aggiorna()`, cioe'
    // anche a ogni messaggio di stato in arrivo e a ogni battito dell'orologio:
    // sull'appello di una classe da venticinque, cinquanta blocchi di fila, in
    // un `userData` che su queste macchine sta spesso sotto un antivirus.
    //
    // Il `sendSync` della lettura qui sopra resta: e' uno solo, all'avvio, e li'
    // il valore serve davvero prima che la pagina disegni.
    ipcRenderer.send('registro:interfaccia', 'scrivi', nuovo)
  },
}))

/**
 * Dove sta sul disco un file trascinato dentro la finestra.
 *
 * Serve a un gesto solo — un `.gguf` lasciato cadere sulla pagina dei modelli —
 * e ci vuole una riga qui perché nel browser un file trascinato non ha un
 * percorso: ha un contenuto, e leggerlo vorrebbe dire far passare quattro
 * gigabyte attraverso la pagina per poi riscriverli da un'altra parte. Il
 * percorso lo sa Electron, e `webUtils.getPathForFile` è il modo che ha di
 * dirlo senza restituire al renderer l'accesso al disco.
 *
 * **Non è una porta sul filesystem**: torna una stringa per un file che una
 * persona ha appena trascinato lì, e niente altro. Che quel percorso sia un
 * GGUF vero, e che ci si possa fare qualcosa, lo decide `data/gguf.ts` dalla
 * parte dell'host — come per ogni altro percorso che arriva da fuori.
 */
contextBridge.exposeInMainWorld('registroFile', {
  percorsoDi: (file: File): string => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      // Un oggetto che file non è, o una versione di Electron che non lo sa
      // dire: la pagina lo legge come «non ci sono riuscito» e manda a usare
      // il pulsante, che apre il dialogo di sistema.
      return ''
    }
  },
})

ipcRenderer.on(CANALE, (_evento, messaggio: unknown) => {
  window.postMessage(messaggio, '*')
})

// Il ricaricamento automatico delle pagine, in sviluppo e solo lì.
//
// Chi lavora sul registro tocca due mondi che si ricostruiscono alla stessa
// velocità ma si ricaricano in due modi diversi:
//
//   il main process        non si ricarica: si riavvia. Se ne occupa
//                          `tools/dev.mjs`, che è chi lo ha lanciato.
//   le pagine              si ricaricano in un decimo di secondo, senza chiudere
//                          niente e senza rifare l'avvio. Se ne occupa questo file.
//
// La divisione è quella giusta e non una comodità: riavviare l'applicazione per
// aver spostato di due pixel un bordo vorrebbe dire, ogni volta, rileggere il
// registro da disco, riaprire la finestra e ritrovare la vista da cui si era
// partiti. Un `reload` invece lascia in piedi l'archivio, i comandi e le
// iscrizioni: il main process non si accorge di niente, e la pagina che
// ritorna richiede lo stato da sé — è la prima cosa che fa, `stato.leggi`.
//
// Si accende dalla variabile d'ambiente `REGISTRO_SVILUPPO`, che mette
// `tools/dev.mjs`. Nell'applicazione impacchettata non c'è, e questo
// file non fa niente.

import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'node:fs'

import { radiceApp } from './context.js'
import { Smaltitore } from './events.js'
import { Uri } from './uri.js'

/** Quanto si aspetta prima di ricaricare, dall'ultimo file scritto. */
const CALMA = 120

/**
 * I bundle che riguardano le pagine. Il main process e il preload no: quelli
 * fanno riavviare, e a riavviare è chi ci ha lanciato.
 */
const PAGINE = /\.(js|css|html)$/

function inSviluppo (): boolean {
  return process.env.REGISTRO_SVILUPPO === '1'
}

/**
 * Ricarica ogni finestra aperta quando un bundle di pagina cambia.
 *
 * `reloadIgnoringCache` e non `reload`: il protocollo `registro://` serve i file
 * dal disco a ogni richiesta, ma la cache del renderer non lo sa, e la seconda
 * modifica allo stesso foglio di stile arriverebbe a una pagina che si ricarica
 * dal proprio ricordo.
 *
 * La pagina del registro è servita da `registro://pagina/<id>`, il cui contenuto
 * il main process tiene in memoria: ricaricandola torna lo stesso HTML, che
 * punta agli stessi bundle — quelli nuovi. È il motivo per cui questo funziona
 * senza che il main process debba rigenerare niente.
 */
export function avviaRicaricamento (dopo: () => void = () => {}): Smaltitore {
  if (!inSviluppo()) return new Smaltitore(() => {})

  const cartella = Uri.joinPath(radiceApp(), 'dist').fsPath

  let attesa: NodeJS.Timeout | null = null
  let vigile: FSWatcher | null = null

  const ricarica = (): void => {
    attesa = null
    const finestre = BrowserWindow.getAllWindows().filter((f) => !f.isDestroyed())
    if (finestre.length === 0) return
    console.log(`[sviluppo] ricarico ${finestre.length} finestre`)
    for (const finestra of finestre) {
      // `dopo` si chiama a pagina caricata e non subito: una pagina che riparte
      // butta via quel che aveva, e chi le rispinge il contenuto prima che sia
      // in piedi glielo consegna al morto. Per il registro non servirebbe — la
      // sua pagina, appena viva, chiede `stato.leggi` da sé — ma lo schermo
      // della classe non chiede niente a nessuno: riceve e basta, e senza
      // questo resterebbe vuoto fino alla prossima modifica del registro.
      finestra.webContents.once('did-finish-load', dopo)
      finestra.webContents.reloadIgnoringCache()
    }
  }

  try {
    vigile = watch(cartella, (_evento, nome) => {
      // Un salvataggio di esbuild scrive il bundle e la sua mappa, e per i due
      // webview scrive anche il foglio di stile: sono tre o quattro eventi a
      // raffica per una modifica sola. Si aspetta che tacciano.
      if (!nome || !PAGINE.test(nome)) return
      if (attesa) clearTimeout(attesa)
      attesa = setTimeout(ricarica, CALMA)
    })
  } catch (errore) {
    // In sviluppo e basta: se la cartella non c'è ancora si dice e si tira
    // avanti, invece di impedire l'avvio per un aiuto che è un di più.
    console.error('[sviluppo] non riesco a guardare i bundle:', errore)
  }

  return new Smaltitore(() => {
    if (attesa) clearTimeout(attesa)
    vigile?.close()
  })
}

/**
 * Apre la console della pagina appena questa ha finito di caricare.
 *
 * In sviluppo il primo posto dove si guarda, quando qualcosa non torna, è la
 * console del renderer: gli errori del webview non arrivano al terminale — là
 * ci va solo quel che scrive il main process — e aprirla a mano dal menu
 * «Visualizza → Strumenti di sviluppo» a ogni riavvio vuol dire farlo venti
 * volte in un pomeriggio, visto che il main process si riavvia a ogni modifica.
 *
 * Si aspetta `did-finish-load` perché una console aperta prima della pagina
 * parte vuota e si perde proprio le righe dell'avvio, che sono quelle che
 * interessano. `once`: a una ricarica la console resta aperta da sé, e
 * riaprirla la farebbe saltare da agganciata a staccata e viceversa.
 *
 * `openDevTools()` senza opzioni lascia la console dov'era l'ultima volta —
 * agganciata a destra, sotto, o staccata: è una scelta di chi lavora, e non è
 * questo file a doverla rifare a ogni avvio.
 */
export function apriConsole (finestra: BrowserWindow): void {
  if (!inSviluppo()) return
  const contenuti = finestra.webContents
  contenuti.once('did-finish-load', () => {
    if (finestra.isDestroyed() || contenuti.isDevToolsOpened()) return
    contenuti.openDevTools()
  })
}

// Strumenti di sviluppo, attivi solo con `REGISTRO_SVILUPPO=1` (lo mette
// `tools/dev.mjs`). Le pagine si ricaricano qui senza riavviare il main
// process, che resta in piedi con archivio e comandi; il main process lo
// riavvia `tools/dev.mjs`.

import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'node:fs'

import { radiceApp } from './context.js'
import { Smaltitore } from './events.js'
import { Uri } from './uri.js'

/** Quanto si aspetta prima di ricaricare, dall'ultimo file scritto. */
const CALMA = 120

/** I bundle delle pagine; main process e preload fanno riavviare, non ricaricare. */
const PAGINE = /\.(js|css|html)$/

function inSviluppo (): boolean {
  return process.env.REGISTRO_SVILUPPO === '1'
}

/**
 * In sviluppo, ricarica ogni finestra quando un bundle di pagina cambia. L'HTML
 * di `registro://pagina/<id>` resta in memoria e punta già ai bundle nuovi.
 */
export function avviaRicaricamento (dopo: () => void = () => {}): Smaltitore {
  if (!inSviluppo()) return new Smaltitore(() => {})

  const cartella = Uri.joinPath(radiceApp(), 'dist').fsPath

  let attesa: NodeJS.Timeout | null = null
  let vigile: FSWatcher | null = null

  const ricarica = (): void => {
    attesa = null
    const quante = ricaricaFinestre(dopo)
    if (quante > 0) console.log(`[sviluppo] ricarico ${quante} finestre`)
  }

  try {
    vigile = watch(cartella, (_evento, nome) => {
      // Una build emette più eventi a raffica (bundle, mappa, stile): si aspetta che tacciano.
      if (!nome || !PAGINE.test(nome)) return
      if (attesa) clearTimeout(attesa)
      attesa = setTimeout(ricarica, CALMA)
    })
  } catch (errore) {
    // Un aiuto di sviluppo non deve impedire l'avvio.
    console.error('[sviluppo] non riesco a guardare i bundle:', errore)
  }

  return new Smaltitore(() => {
    if (attesa) clearTimeout(attesa)
    vigile?.close()
  })
}

/**
 * Ricarica tutte le finestre, senza cache, e dice quante erano (bundle cambiato
 * in sviluppo, lingua cambiata). `dopo` si chiama a pagina caricata: la
 * proiezione non chiede lo stato da sé, glielo si rimanda.
 */
export function ricaricaFinestre (dopo: () => void = () => {}): number {
  const finestre = BrowserWindow.getAllWindows().filter((f) => !f.isDestroyed())
  for (const finestra of finestre) {
    finestra.webContents.once('did-finish-load', dopo)
    finestra.webContents.reloadIgnoringCache()
  }
  return finestre.length
}

/**
 * In sviluppo, apre la console della pagina a caricamento finito, per non
 * perdere le righe dell'avvio. `once` perché alla ricarica resta aperta da sé.
 */
export function apriConsole (finestra: BrowserWindow): void {
  if (!inSviluppo()) return
  const contenuti = finestra.webContents
  contenuti.once('did-finish-load', () => {
    if (finestra.isDestroyed() || contenuti.isDevToolsOpened()) return
    contenuti.openDevTools()
  })
}

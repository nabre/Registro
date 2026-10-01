// Finestra sentinella nascosta: vive sullo sfondo per intercettare l'evento di
// session end (`query-session-end`) di Windows anche quando il registro ha il solo
// vassoio acceso (nessuna finestra utente aperta).

import { BrowserWindow } from 'electron'

import { preferenzeComuni } from '../apparato/theme.js'

let finestraSentinella: BrowserWindow | null = null

/**
 * Crea o restituisce la finestra sentinella nascosta.
 */
export function assicuraSentinella (): BrowserWindow {
  if (finestraSentinella && !finestraSentinella.isDestroyed()) {
    return finestraSentinella
  }

  finestraSentinella = new BrowserWindow({
    width: 0,
    height: 0,
    show: false,
    skipTaskbar: true,
    focusable: false,
    // Come le altre finestre: anche una pagina vuota gira isolata e in sandbox.
    webPreferences: {
      ...preferenzeComuni(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })
  // Una pagina vuota: senza, il renderer non risponde a DevTools e
  // `_electron.launch` delle prove d'interfaccia resta appeso.
  void finestraSentinella.loadURL('about:blank')

  return finestraSentinella
}

/** Se una finestra è la sentinella nascosta. */
export function èSentinella (finestra: BrowserWindow): boolean {
  return finestra === finestraSentinella
}

/** Le sole finestre dell'utente, senza la sentinella nascosta. */
export function finestreUtenti (): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter(
    (f) => !f.isDestroyed() && f !== finestraSentinella,
  )
}

/** Chiude e distrugge la sentinella all'uscita del programma. */
export function chiudiSentinella (): void {
  if (finestraSentinella && !finestraSentinella.isDestroyed()) {
    finestraSentinella.destroy()
    finestraSentinella = null
  }
}

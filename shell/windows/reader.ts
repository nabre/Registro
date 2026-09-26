// Il lettore dei documenti: un PDF del registro in una finestra
// dell'applicazione, col lettore di Chromium (pagine, zoom, ricerca, stampa).
// Basta una finestra con i plugin accesi e l'indirizzo `registro://` del file,
// che il protocollo materializza dal documento d'anno.
//
// Una finestra per documento: riaprendo lo stesso si torna a quella.

import { BrowserWindow } from 'electron'

import { icona } from '../../src/environment/context.js'
import { postoDi, ricordaPosto } from '../../src/environment/placement.js'
import { coloreSfondo, preferenzeComuni } from '../../src/environment/theme.js'
import { chiudiLeVieDiFuga } from '../../src/environment/navigation.js'
import { mostraComunque } from '../../src/environment/showAnyway.js'
import { Uri } from '../../src/environment/uri.js'

/** Le finestre aperte, per percorso del documento. */
const aperte = new Map<string, BrowserWindow>()

/**
 * L'indirizzo di un file dell'anno, come da `asWebviewUri`: autorità `dati` e
 * percorso intero (la difesa sono le radici concesse).
 */
function indirizzoDi (file: Uri): string {
  return Uri.parse('registro://dati').with({ path: file.path }).toString()
}

/** Mostra un documento in una finestra; `titolo` è il nome del documento, non il percorso. */
export function mostraDocumento (file: Uri, titolo: string): void {
  const chiave = file.fsPath
  const gia = aperte.get(chiave)
  if (gia && !gia.isDestroyed()) {
    gia.show()
    gia.focus()
    // Il documento può essere stato rifatto: si ricarica.
    gia.webContents.reload()
    return
  }

  const nata = new BrowserWindow({
    // Dove si era lasciata l'ultima finestra di lettura.
    ...postoDi('lettore', { width: 900, height: 1000, minWidth: 480 }),
    title: titolo,
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    // Qui si legge soltanto: niente menu.
    autoHideMenuBar: true,
    webPreferences: {
      ...preferenzeComuni(),
      // I plugin accendono il lettore di PDF di Chromium.
      plugins: true,
      // Niente preload né Node: qui non gira codice nostro.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  aperte.set(chiave, nata)
  // Il lettore apre i collegamenti del PDF, che arriva da fuori.
  chiudiLeVieDiFuga(nata)
  ricordaPosto('lettore', nata)

  nata.once('ready-to-show', () => nata.show())
  // Il lettore non sempre annuncia di essere pronto: dopo un po' si mostra lo stesso.
  mostraComunque(nata)

  nata.on('closed', () => {
    if (aperte.get(chiave) === nata) aperte.delete(chiave)
  })

  void nata.loadURL(indirizzoDi(file))
}

/** Chiude i lettori aperti, quando i loro file non valgono più (cambio d'anno). */
export function chiudiLettori (): void {
  for (const finestra of aperte.values()) {
    if (!finestra.isDestroyed()) finestra.close()
  }
  aperte.clear()
}

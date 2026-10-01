// Il lettore dei documenti: un PDF del registro in una finestra
// dell'applicazione, col lettore di Chromium (pagine, zoom, ricerca, stampa).
// Il PDF sta in una cornice della pagina `desktop/shell/pages/reader/`, che
// sopra ci mette la barra del titolo come le altre finestre; l'indirizzo
// `registro://` del file lo materializza il protocollo dal documento d'anno.
//
// Una finestra per documento: riaprendo lo stesso si torna a quella.

import { BrowserWindow } from 'electron'

import { icona } from '#desktop/apparato/context.js'
import { postoDi, ricordaPosto } from '#desktop/apparato/placement.js'
import {
  coloreSfondo,
  cornicePropria,
  preferenzeComuni,
  ricordaFascia,
  segniDellaCornice,
  togliMenu,
} from '#desktop/apparato/theme.js'
import { chiudiLeVieDiFuga } from '#desktop/apparato/navigation.js'
import { mostraComunque } from '#desktop/apparato/showAnyway.js'
import { Uri } from '#core/apparato/uri.js'

/** Le finestre aperte, per percorso del documento. */
const aperte = new Map<string, BrowserWindow>()

/**
 * L'indirizzo di un file dell'anno, come da `asWebviewUri`: autorità `dati` e
 * percorso intero (la difesa sono le radici concesse).
 */
function indirizzoDi (file: Uri): string {
  return Uri.parse('registro://dati').with({ path: file.path }).toString()
}

/** La pagina del lettore, con il file e il nome da mostrare nella query. */
function paginaDi (file: Uri, titolo: string): string {
  const segni = new URLSearchParams(segniDellaCornice())
  segni.set('file', indirizzoDi(file))
  segni.set('titolo', titolo)
  return `registro://app/dist/reader.html?${segni.toString()}`
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
    // La barra del titolo la disegna la pagina, come nel pannello.
    ...cornicePropria(),
    webPreferences: {
      ...preferenzeComuni(),
      // I plugin accendono il lettore di PDF di Chromium.
      plugins: true,
      // Niente preload né Node: la pagina disegna la barra e poco altro, non
      // parla col main process.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  aperte.set(chiave, nata)
  ricordaFascia(nata)
  // Qui si legge soltanto: niente menu.
  togliMenu(nata)
  // Il lettore apre i collegamenti del PDF, che arriva da fuori.
  chiudiLeVieDiFuga(nata)
  ricordaPosto('lettore', nata)

  nata.once('ready-to-show', () => nata.show())
  // Il lettore non sempre annuncia di essere pronto: dopo un po' si mostra lo stesso.
  mostraComunque(nata)

  nata.on('closed', () => {
    if (aperte.get(chiave) === nata) aperte.delete(chiave)
  })

  void nata.loadURL(paginaDi(file, titolo))
}

/** Chiude i lettori aperti, quando i loro file non valgono più (cambio d'anno). */
export function chiudiLettori (): void {
  for (const finestra of aperte.values()) {
    if (!finestra.isDestroyed()) finestra.close()
  }
  aperte.clear()
}

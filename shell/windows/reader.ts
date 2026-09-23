// Il lettore dei documenti: un PDF del registro, guardato dentro
// l'applicazione.
//
// Fin qui guardare un documento voleva dire consegnarlo al programma di
// sistema: la finestra usciva dal registro, si apriva su un lettore che non è
// suo e che a volte chiede di aggiornarsi, e chi stava controllando venti fogli
// prima di consegnarli passava metà del tempo a cercare la finestra giusta
// nella barra delle applicazioni. Il controllo prima della consegna è un gesto
// del registro — «questa scheda è quella che voglio dare?» — e sta dentro.
//
// Non c'è niente da disegnare: il PDF lo mostra il lettore di Chromium, che
// Electron porta con sé — pagine, zoom, ricerca nel testo, stampa. Serve
// soltanto una finestra con i plugin accesi e l'indirizzo `registro://` del
// file, che il protocollo materializza dal documento d'anno quando lo si
// chiede.
//
// Una finestra per documento, e riaprendo lo stesso si torna a quella: chi
// confronta la scheda di due allievi le vuole tutt'e due aperte, ma chi ricarica
// la stessa non vuole una pila di finestre identiche.

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
 * L'indirizzo con cui una pagina chiede un file dell'anno.
 *
 * È lo stesso che il pannello riceve da `asWebviewUri`: autorità `dati` e
 * percorso intero, perché la cartella dei dati si sposta e la difesa non è il
 * percorso ma le radici concesse.
 */
function indirizzoDi (file: Uri): string {
  return Uri.parse('registro://dati').with({ path: file.path }).toString()
}

/**
 * Mostra un documento in una finestra del registro.
 *
 * `titolo` è quel che si legge nella barra della finestra: il nome del
 * documento, non il suo percorso — chi ne ha tre aperte le distingue da lì.
 */
export function mostraDocumento (file: Uri, titolo: string): void {
  const chiave = file.fsPath
  const gia = aperte.get(chiave)
  if (gia && !gia.isDestroyed()) {
    gia.show()
    gia.focus()
    // Ricaricare è il punto: si arriva qui anche dopo aver rifatto il
    // documento, e la finestra mostrerebbe la copia di prima.
    gia.webContents.reload()
    return
  }

  const nata = new BrowserWindow({
    // Dove si era lasciata l'ultima finestra di lettura: chi controlla venti
    // fogli prima di consegnarli la mette una volta sul secondo schermo, non a
    // ogni documento.
    ...postoDi('lettore', { width: 900, height: 1000, minWidth: 480 }),
    title: titolo,
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    // Il menu del registro qui non serve: in questa finestra non si modifica
    // niente, si legge.
    autoHideMenuBar: true,
    webPreferences: {
      ...preferenzeComuni(),
      // I plugin accendono il lettore di PDF di Chromium: è tutta
      // l'implementazione di questa finestra.
      plugins: true,
      // Niente preload e niente Node: qui dentro non gira codice nostro, c'è
      // un PDF che si guarda.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  aperte.set(chiave, nata)
  // Anche qui, benché dentro ci sia solo un PDF: il lettore di Chromium apre i
  // collegamenti che il PDF contiene, e un PDF arriva da fuori per definizione.
  chiudiLeVieDiFuga(nata)
  ricordaPosto('lettore', nata)

  nata.once('ready-to-show', () => nata.show())
  // Il lettore di PDF non sempre annuncia di essere pronto: se dopo un secondo
  // la finestra è ancora nascosta si mostra lo stesso, perché una finestra
  // invisibile che non si può nemmeno chiudere è peggio di una vuota.
  mostraComunque(nata)

  nata.on('closed', () => {
    if (aperte.get(chiave) === nata) aperte.delete(chiave)
  })

  void nata.loadURL(indirizzoDi(file))
}

/** Chiude i lettori aperti: si fa chiudendo l'anno, che rende falsi i loro file. */
export function chiudiLettori (): void {
  for (const finestra of aperte.values()) {
    if (!finestra.isDestroyed()) finestra.close()
  }
  aperte.clear()
}

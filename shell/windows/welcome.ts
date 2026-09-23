// La finestra di benvenuto: la si vede quando il registro non ha nessun anno
// aperto — al primo avvio, e dopo aver chiuso il documento.
//
// Prima era `dialog.showMessageBox`: «Apri…», «Crea un nuovo anno…», «Esci».
// Tre pulsanti di sistema che chiedevano *come* cominciare, quando la domanda
// vera — dal secondo anno in poi — è *quale* riaprire. La risposta stava dietro
// il dialogo dei file, da sfogliare ogni volta anche per il documento che si era
// chiuso cinque minuti prima.
//
// Qui l'elenco dei documenti noti è la pagina. È lo stesso elenco del menu «File»
// del registro — `environment/documents.ts`, che vive in `userData` — e si governa
// di qui: si apre, si mette da parte, si dimentica.
//
// Il file non lo sceglie questo modulo: `mostra` riceve chi lo sa fare, che è
// `main.ts`, dove sta il dialogo di sistema. Questo file apre una
// finestra, ascolta il suo canale e torna una scelta — e chi l'ha chiesta ne fa
// quel che sa farne.

import { app, BrowserWindow, ipcMain } from 'electron'

import { alCambioDocumenti, dimenticaDocumento, documentiNoti, impostaPreferito } from '../../src/environment/documents.js'
import { icona, percorsoPreload } from '../../src/environment/context.js'
import { CANALE } from '../../src/environment/windows.js'
import { postoDi, ricordaPosto } from '../../src/environment/placement.js'
import { coloreSfondo, preferenzeComuni } from '../../src/environment/theme.js'
import { chiudiLeVieDiFuga } from '../../src/environment/navigation.js'
import { mostraComunque } from '../../src/environment/showAnyway.js'
import { Uri } from '../../src/environment/uri.js'
import { ESTENSIONE } from '../../src/data/package.js'

/** Quel che la pagina manda al main process. */
export type RichiestaBenvenuto =
  | { benvenuto: 'pronto' }
  | { benvenuto: 'apri' }
  | { benvenuto: 'apriPercorso', percorso: string }
  | { benvenuto: 'crea' }
  | { benvenuto: 'preferito', percorso: string, valore: boolean }
  | { benvenuto: 'dimentica', percorso: string }
  | { benvenuto: 'esci' }

function eRichiesta (messaggio: unknown): messaggio is RichiestaBenvenuto {
  return typeof messaggio === 'object' && messaggio !== null && 'benvenuto' in messaggio
}

/**
 * Quel che si è scelto: un documento da aprire, oppure la volontà di crearne
 * uno — e `null` se si è rinunciato, che all'avvio vuol dire non partire.
 */
export type Scelta =
  | { tipo: 'apri', documento: Uri }
  | { tipo: 'crea' }
  /**
   * La finestra si è chiusa perché un documento è arrivato da un'altra strada:
   * un doppio clic su un `.registro`, una voce dei recenti di Windows. Non è
   * una rinuncia, e chi aspettava non deve trattarla come tale — c'è già un
   * anno che si sta aprendo.
   */
  | { tipo: 'altrove' }

/** Chi sa fare quel che questa finestra non sa: il dialogo dei file. */
export interface Azioni {
  scegliDocumento (): Promise<Uri | null>
}

let finestra: BrowserWindow | null = null
let inAscolto = false

/** La promessa aperta: la risolve il primo gesto che conclude, e una volta sola. */
let concludi: ((scelta: Scelta | null) => void) | null = null

function viva (): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null
}

/**
 * Chiude il benvenuto senza concludere niente.
 *
 * Serve a chi apre un documento da un'altra strada mentre la pagina è lì: un
 * doppio clic su un `.registro` dal gestore file, una voce dei recenti di
 * Windows. Il registro ha già quel che gli serve, e una finestra che chiede
 * ancora «quale anno?» sarebbe una domanda a cui si è già risposto.
 */
export function chiudiBenvenuto (): void {
  if (!viva()) return
  finisci({ tipo: 'altrove' })
}

/**
 * La versione dell'applicazione, in fondo alla pagina.
 *
 * In una prova `app` è un finto Electron che può non saperla dire, e un
 * benvenuto che non si apre per una riga di piè di pagina sarebbe sproporzionato.
 */
function versione (): string {
  try {
    return `Versione ${app.getVersion()}`
  } catch {
    return ''
  }
}

/** L'elenco così com'è adesso, mandato alla pagina. */
function annunciaElenco (aperta: BrowserWindow): void {
  aperta.webContents.send(CANALE, {
    benvenuto: 'elenco',
    invito:
      'Il registro lavora su un documento per anno scolastico — un file «' + ESTENSIONE + '». ' +
      'Riapri quello di ieri, aprine un altro, oppure creane uno nuovo.',
    versione: versione(),
    voci: documentiNoti(),
  })
}

async function rispondi (
  aperta: BrowserWindow,
  richiesta: RichiestaBenvenuto,
  azioni: Azioni,
): Promise<void> {
  switch (richiesta.benvenuto) {
    case 'pronto':
      // La pagina si è disegnata: prima di adesso la finestra sarebbe apparsa
      // vuota e poi avrebbe fatto saltare il contenuto sotto gli occhi.
      if (!aperta.isVisible()) aperta.show()
      break

    case 'apri': {
      const scelto = await azioni.scegliDocumento()
      // Annullare il dialogo dei file riporta qui, non fuori dall'applicazione:
      // è un ripensamento, non una rinuncia.
      if (scelto) finisci({ tipo: 'apri', documento: scelto })
      break
    }

    case 'apriPercorso':
      finisci({ tipo: 'apri', documento: Uri.file(richiesta.percorso) })
      break

    case 'crea':
      // Dove metterlo lo chiede `anno.crea`, con il dialogo «salva con nome»:
      // chiederlo due volte — una qui e una lì — sarebbe lo stesso dialogo due
      // volte di fila per un documento solo.
      finisci({ tipo: 'crea' })
      break

    case 'preferito':
      impostaPreferito(richiesta.percorso, richiesta.valore)
      break

    case 'dimentica':
      dimenticaDocumento(richiesta.percorso)
      break

    case 'esci':
      finisci(null)
      break
  }
}

/** Conclude: si risolve la promessa e la finestra se ne va. */
function finisci (scelta: Scelta | null): void {
  const risolvi = concludi
  const aperta = viva()
  concludi = null
  finestra = null
  aperta?.close()
  risolvi?.(scelta)
}

function ascolta (azioni: Azioni): void {
  if (inAscolto) return
  inAscolto = true
  // Sullo stesso canale di tutto il resto: `windows.ts` e `menu.ts` scartano
  // i mittenti che non conoscono, e qui si scartano i loro.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    const aperta = viva()
    if (!aperta || evento.sender.id !== aperta.webContents.id) return
    if (eRichiesta(messaggio)) void rispondi(aperta, messaggio, azioni)
  })
}

/**
 * Mostra il benvenuto e aspetta una scelta.
 *
 * Torna `null` se si è chiusa la finestra senza scegliere: all'avvio vuol dire
 * che non c'è niente da aprire e l'applicazione esce, a documento chiuso vuol
 * dire che si resta come si è — con l'icona accanto all'orologio, se c'è.
 *
 * Una sola finestra: chiamarla due volte porta davanti quella che c'è già e
 * torna la stessa attesa, perché due benvenuti che chiedono lo stesso darebbero
 * due risposte di cui una arriverebbe a cose fatte.
 */
export function mostraBenvenuto (azioni: Azioni): Promise<Scelta | null> {
  const gia = viva()
  if (gia) {
    gia.show()
    gia.focus()
    return new Promise((risolvi) => {
      const prima = concludi
      concludi = (scelta) => {
        prima?.(scelta)
        risolvi(scelta)
      }
    })
  }

  ascolta(azioni)
  const nata = new BrowserWindow({
    ...postoDi('benvenuto', { width: 720, height: 560, minWidth: 520, minHeight: 420 }),
    title: 'Registro docenti',
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    // Nessun menu: qui non c'è ancora niente su cui i comandi del registro
    // possano lavorare, e una barra piena di voci spente è peggio di niente.
    autoHideMenuBar: true,
    webPreferences: {
      ...preferenzeComuni(),
      preload: percorsoPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  finestra = nata
  chiudiLeVieDiFuga(nata)
  ricordaPosto('benvenuto', nata)

  // L'elenco si rifà da sé: la stella e la croce passano da `documents.ts`, e
  // la pagina deve vedere il risultato del gesto che ha appena fatto.
  const iscrizione = alCambioDocumenti(() => {
    if (!nata.isDestroyed()) annunciaElenco(nata)
  })

  nata.webContents.on('did-finish-load', () => {
    if (nata.isDestroyed()) return
    annunciaElenco(nata)
    // Come per i dialoghi: se la pagina arriva ma non dice di essersi
    // disegnata, la si mostra lo stesso, così almeno la si può chiudere.
    mostraComunque(nata)
  })

  const attesa = new Promise<Scelta | null>((risolvi) => {
    concludi = risolvi
  })

  nata.on('closed', () => {
    iscrizione.dispose()
    if (finestra === nata) finestra = null
    // Chiusa con la X, senza aver scelto: vale quanto «Esci».
    const risolvi = concludi
    concludi = null
    risolvi?.(null)
  })

  void nata.loadURL('registro://app/dist/welcome.html')
  return attesa
}

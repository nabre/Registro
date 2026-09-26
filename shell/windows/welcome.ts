// La finestra di benvenuto, quando nessun anno è aperto: al primo avvio e dopo
// aver chiuso il documento. La pagina è l'elenco dei documenti noti
// (`environment/documents.ts`, lo stesso del menu «File»): si apre, si mette da
// parte, si dimentica.
//
// In fondo gli aggiornamenti, inoltrati da `environment/updates.ts`: senza anno
// aperto è l'unica finestra che li mostra.
//
// Il dialogo dei file lo fornisce `main.ts` (`Azioni`): qui si apre la
// finestra, si ascolta il canale e si torna una scelta.

import { app, BrowserWindow, ipcMain } from 'electron'

import {
  alCambioDocumenti,
  dimenticaDocumento,
  documentiNoti,
  impostaPreferito,
  verificaDocumenti,
} from '../../src/environment/documents.js'
import { icona } from '../../src/environment/context.js'
import { openExternal } from '../../src/environment/commands.js'
import { CANALE } from '../../src/environment/channels.js'
import { postoDi, ricordaPosto } from '../../src/environment/placement.js'
import { coloreSfondo, preferenzeConPonte } from '../../src/environment/theme.js'
import { chiudiLeVieDiFuga } from '../../src/environment/navigation.js'
import { mostraComunque } from '../../src/environment/showAnyway.js'
import {
  alCambioAggiornamenti,
  controllaAggiornamenti,
  installaAggiornamento,
  scaricaAggiornamento,
  statoAggiornamenti,
} from '../../src/environment/updates.js'
import { Uri } from '../../src/environment/uri.js'
import type { RaccontoAggiornamenti } from '../../src/protocol.js'
import { ESTENSIONE } from '../../src/data/package.js'
import { testi } from './welcome.testi.js'

/** Quel che la pagina manda al main process. */
export type RichiestaBenvenuto =
  | { benvenuto: 'pronto' }
  | { benvenuto: 'apri' }
  | { benvenuto: 'apriPercorso', percorso: string }
  | { benvenuto: 'crea' }
  | { benvenuto: 'preferito', percorso: string, valore: boolean }
  | { benvenuto: 'dimentica', percorso: string }
  | { benvenuto: 'esci' }
  /** Il gesto che il racconto degli aggiornamenti propone adesso. */
  | { benvenuto: 'aggiornamento', gesto: GestoAggiornamenti }
  /** La ✕ del filetto: quella notizia non si ripete fino alla prossima. */
  | { benvenuto: 'nascondiNotizia', notizia: string }

type GestoAggiornamenti = NonNullable<RaccontoAggiornamenti['gesto']>['tipo']

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
   * Chiusa perché un documento è arrivato da un'altra strada (doppio clic,
   * recenti di Windows): non è una rinuncia, un anno si sta già aprendo.
   */
  | { tipo: 'altrove' }

/** Chi sa fare quel che questa finestra non sa: il dialogo dei file, e aprire un anno. */
export interface Azioni {
  scegliDocumento (): Promise<Uri | null>
  /**
   * Apre un documento scelto quando la finestra non aspetta più risposte: il
   * benvenuto si è chiuso mentre il dialogo «Apri…» era aperto, e la scelta vale lo stesso.
   */
  apriAltrove? (documento: Uri): void
}

let finestra: BrowserWindow | null = null
let inAscolto = false

/** La promessa aperta: la risolve il primo gesto che conclude, e una volta sola. */
let concludi: ((scelta: Scelta | null) => void) | null = null

function viva (): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null
}

/**
 * Porta davanti il benvenuto, se è aperto (`false` se non c'è). Non aspetta la
 * scelta: la aspetta già chi l'ha aperto, e due attese aprirebbero l'anno due volte.
 */
export function mettiDavantiBenvenuto (): boolean {
  const gia = viva()
  if (!gia) return false
  if (gia.isMinimized()) gia.restore()
  gia.show()
  gia.focus()
  return true
}

/** Chiude il benvenuto con `altrove`: un documento è arrivato da un'altra strada. */
export function chiudiBenvenuto (): void {
  if (!viva()) return
  finisci({ tipo: 'altrove' })
}

/** La versione, in fondo alla pagina. Il finto Electron delle prove può non saperla. */
function versione (): string {
  try {
    return testi().versione(app.getVersion())
  } catch {
    return ''
  }
}

/** L'elenco così com'è adesso, mandato alla pagina. */
function annunciaElenco (aperta: BrowserWindow): void {
  aperta.webContents.send(CANALE, {
    benvenuto: 'elenco',
    invito: testi().invito(ESTENSIONE),
    versione: versione(),
    voci: documentiNoti(),
  })
}

/**
 * La notizia chiusa con la ✕ del filetto (`RaccontoAggiornamenti.notizia`).
 * Qui e non nella pagina perché ogni benvenuto è una finestra nuova; vale
 * finché il registro resta acceso.
 */
let notiziaNascosta: string | undefined

/** Lo stato degli aggiornamenti, mandato alla pagina così com'è. */
function annunciaAggiornamenti (aperta: BrowserWindow): void {
  aperta.webContents.send(CANALE, {
    benvenuto: 'aggiornamenti',
    stato: statoAggiornamenti(),
    nascosta: notiziaNascosta,
  })
}

/**
 * Un gesto sugli aggiornamenti, con le stesse funzioni del pannello: un gesto
 * fuori fase non fa niente.
 */
function gestoAggiornamenti (gesto: GestoAggiornamenti): void {
  switch (gesto) {
    case 'aggiornamenti.controlla':
      controllaAggiornamenti()
      break
    case 'aggiornamenti.scarica':
      void scaricaAggiornamento()
      break
    case 'aggiornamenti.installa':
      // Senza anno aperto non c'è niente da confermare; si esce da `before-quit`.
      installaAggiornamento()
      break
    case 'pagina':
      void openExternal(Uri.parse(statoAggiornamenti().pagina))
      break
  }
}

async function rispondi (
  aperta: BrowserWindow,
  richiesta: RichiestaBenvenuto,
  azioni: Azioni,
): Promise<void> {
  switch (richiesta.benvenuto) {
    case 'pronto':
      // Si mostra solo a pagina disegnata, per non apparire vuota.
      if (!aperta.isVisible()) aperta.show()
      break

    case 'apri': {
      const scelto = await azioni.scegliDocumento()
      // Annullare il dialogo riporta qui: è un ripensamento, non una rinuncia.
      if (!scelto) break
      // Il benvenuto può essersene andato mentre il dialogo era aperto: allora si apre per altra via.
      if (viva() === aperta && concludi) finisci({ tipo: 'apri', documento: scelto })
      else azioni.apriAltrove?.(scelto)
      break
    }

    case 'apriPercorso':
      finisci({ tipo: 'apri', documento: Uri.file(richiesta.percorso) })
      break

    case 'crea':
      // Il posto lo chiede `anno.crea`, non qui.
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

    case 'aggiornamento':
      gestoAggiornamenti(richiesta.gesto)
      break

    case 'nascondiNotizia':
      notiziaNascosta = richiesta.notizia
      annunciaAggiornamenti(aperta)
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
  // Canale condiviso: ognuno scarta i mittenti che non sono suoi.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    const aperta = viva()
    if (!aperta || evento.sender.id !== aperta.webContents.id) return
    if (eRichiesta(messaggio)) void rispondi(aperta, messaggio, azioni)
  })
}

/**
 * Mostra il benvenuto e aspetta una scelta; `null` se si chiude senza scegliere.
 * Una sola finestra: una seconda chiamata la porta davanti e condivide l'attesa.
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
    ...postoDi('benvenuto', { width: 860, height: 580, minWidth: 520, minHeight: 420 }),
    // testo-fisso: il marchio non si traduce
    title: 'Regiclass',
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    // Nessun menu: senza anno i comandi del registro non hanno su che lavorare.
    autoHideMenuBar: true,
    webPreferences: preferenzeConPonte(),
  })
  finestra = nata
  chiudiLeVieDiFuga(nata)
  ricordaPosto('benvenuto', nata)

  // L'elenco si rimanda a ogni cambio, anche per i gesti della pagina stessa.
  const iscrizione = alCambioDocumenti(() => {
    if (!nata.isDestroyed()) annunciaElenco(nata)
  })
  // Anche gli aggiornamenti: uno scarico dura minuti.
  const aggiornamenti = alCambioAggiornamenti(() => {
    if (!nata.isDestroyed()) annunciaAggiornamenti(nata)
  })

  nata.webContents.on('did-finish-load', () => {
    if (nata.isDestroyed()) return
    annunciaElenco(nata)
    annunciaAggiornamenti(nata)
    // Si ricontrolla subito sul disco, senza aspettare il giro periodico: se
    // cambia, `alCambioDocumenti` lo rimanda.
    void verificaDocumenti()
    // Se la pagina non dice di essersi disegnata, la si mostra lo stesso.
    mostraComunque(nata)
  })

  const attesa = new Promise<Scelta | null>((risolvi) => {
    concludi = risolvi
  })

  nata.on('closed', () => {
    iscrizione.dispose()
    aggiornamenti.dispose()
    if (finestra === nata) finestra = null
    // Chiusa con la X, senza aver scelto: vale quanto «Esci».
    const risolvi = concludi
    concludi = null
    risolvi?.(null)
  })

  void nata.loadURL('registro://app/dist/welcome.html')
  return attesa
}

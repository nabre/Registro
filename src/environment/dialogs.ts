// Tutto quel che il registro chiede all'utente.
//
// Tre famiglie, e tre risposte diverse:
//
//   i messaggi        `dialog.showMessageBox`, quando c'è da rispondere;
//                     una notifica nel pannello, quando c'è solo da leggere
//   i file            `dialog.showOpenDialog`, e `shell.openPath` per aprirli
//   le domande        una finestra nostra, perché in Electron non ci sono
//
// La distinzione fra le prime due è la sola libertà che ci si prende rispetto a
// VS Code, ed è per restargli fedeli: là un `showInformationMessage` senza
// bottoni è una nuvoletta che si dissolve, e il registro ne manda una per ogni
// PDF smistato. Tradurle tutte in una finestra modale vorrebbe dire venti clic
// per una cassetta di venti file. Quando invece i bottoni ci sono, una risposta
// serve davvero, e la finestra di sistema è il posto giusto per chiederla.

import { BrowserWindow, dialog, ipcMain, screen, shell } from 'electron'

import { icona, percorsoPreload } from './context.js'
import { coloreSfondo, preferenzeComuni } from './theme.js'
import { chiudiLeVieDiFuga } from './navigation.js'
import { type Annullamento, SorgenteAnnullamento } from './events.js'
import { CANALE } from './windows.js'
import { DoveAvanzamento } from './enumerations.js'
import { Uri } from './uri.js'
import { limita } from '../domain/calculations.js'

// ------------------------------------------------------------------ le forme

export interface VoceMessaggio {
  title: string
  isCloseAffordance?: boolean
}

interface OpzioniMessaggio {
  modal?: boolean
  detail?: string
}

export interface VoceScelta {
  label: string
  description?: string
  detail?: string
}

interface OpzioniInputBox {
  title?: string
  prompt?: string
  value?: string
  placeHolder?: string
  password?: boolean
  ignoreFocusOut?: boolean
  validateInput?: (valore: string) => string | null | undefined | Promise<string | null | undefined>
}

interface OpzioniQuickPick {
  title?: string
  placeHolder?: string
  ignoreFocusOut?: boolean
}

interface OpzioniApertura {
  title?: string
  openLabel?: string
  canSelectMany?: boolean
  canSelectFiles?: boolean
  canSelectFolders?: boolean
  defaultUri?: Uri
  filters?: Record<string, string[]>
}

interface OpzioniSalvataggio {
  title?: string
  saveLabel?: string
  defaultUri?: Uri
  filters?: Record<string, string[]>
}

interface Avanzamento {
  report (quanto: { message?: string, increment?: number }): void
}

interface OpzioniAvanzamento {
  location?: DoveAvanzamento | { viewId: string }
  title?: string
  cancellable?: boolean
}

// --------------------------------------------------------- le finestre in giro

/** Le finestre che sono nostre e non del registro: i dialoghi non ricevono le notifiche. */
const diDialogo = new Set<number>()

/**
 * Una finestra di servizio, che non è del registro: non riceve le nuvolette e
 * non fa da padre a un dialogo modale.
 *
 * Serve alla finestra d'avvio (`shell/windows/splash.ts`): un dialogo arrivato
 * durante l'avvio — «l'anno risulta già aperto altrove» — appoggiato su di lei
 * se ne andrebbe insieme a lei, a metà della domanda.
 */
export function escludiDaiDialoghi (finestra: BrowserWindow): void {
  const id = finestra.webContents.id
  diDialogo.add(id)
  finestra.once('closed', () => diDialogo.delete(id))
}

/** Le finestre del registro: il pannello, la proiezione. */
function delRegistro (): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter(
    (finestra) => !finestra.isDestroyed() && !diDialogo.has(finestra.webContents.id),
  )
}

/**
 * Una nuvoletta nel pannello, che è quel che `showInformationMessage` è in VS
 * Code. Si manda a tutte le finestre del registro: la proiezione scarta da sé
 * quel che non è contenuto per la classe, e così non serve sapere qui quale
 * finestra è quale.
 */
function notifica (livello: 'info' | 'avviso' | 'errore', testo: string): boolean {
  const finestre = delRegistro()
  for (const finestra of finestre) {
    finestra.webContents.send(CANALE, { tipo: 'notifica', livello, testo })
  }
  return finestre.length > 0
}

/** La finestra su cui appoggiare un dialogo modale. */
function finestraPadre (): BrowserWindow | undefined {
  const conFuoco = BrowserWindow.getFocusedWindow()
  if (conFuoco && !diDialogo.has(conFuoco.webContents.id)) return conFuoco
  return delRegistro()[0]
}

// ----------------------------------------------------------------- i messaggi

type Bottone = string | VoceMessaggio

/** Separa le opzioni dai bottoni: in VS Code stanno tutti negli argomenti variadici. */
function scomponi (resto: unknown[]): { opzioni: OpzioniMessaggio, bottoni: Bottone[] } {
  const primo = resto[0]
  const eOpzioni = typeof primo === 'object' && primo !== null && !('title' in primo)
  return {
    opzioni: eOpzioni ? (primo) : {},
    bottoni: (eOpzioni ? resto.slice(1) : resto) as Bottone[],
  }
}

function etichettaDi (bottone: Bottone): string {
  return typeof bottone === 'string' ? bottone : bottone.title
}

async function mostraMessaggio (
  tipo: 'info' | 'warning' | 'error',
  messaggio: string,
  resto: unknown[],
): Promise<string | undefined> {
  const { opzioni, bottoni } = scomponi(resto)

  if (bottoni.length === 0 && !opzioni.modal) {
    const livello = tipo === 'error' ? 'errore' : tipo === 'warning' ? 'avviso' : 'info'
    const testo = opzioni.detail ? `${messaggio} ${opzioni.detail}` : messaggio
    // Se non c'è nessuna finestra ad accoglierla — un guasto durante l'avvio —
    // la nuvoletta si perderebbe: allora la si dice in una finestra vera.
    if (notifica(livello, testo)) return undefined
  }

  const etichette = bottoni.map(etichettaDi)
  // Il bottone per andarsene c'è sempre quando c'è una scelta: tutto il codice
  // chiamante confronta la risposta con l'etichetta che si aspetta, e «Annulla»
  // esce da quel confronto come `undefined`.
  const tutti = etichette.length > 0 ? [...etichette, 'Annulla'] : ['OK']

  const padre = finestraPadre()
  const scelte = {
    type: tipo,
    message: messaggio,
    detail: opzioni.detail,
    buttons: tutti,
    defaultId: 0,
    cancelId: tutti.length - 1,
    // Senza, su macOS i bottoni oltre il secondo diventano un menu a tendina.
    noLink: true,
  }
  const esito = padre ? await dialog.showMessageBox(padre, scelte) : await dialog.showMessageBox(scelte)

  return etichette[esito.response]
}

export function showInformationMessage (
  messaggio: string,
  ...resto: unknown[]
): Promise<string | undefined> {
  return mostraMessaggio('info', messaggio, resto)
}

export function showWarningMessage (
  messaggio: string,
  ...resto: unknown[]
): Promise<string | undefined> {
  return mostraMessaggio('warning', messaggio, resto)
}

export function showErrorMessage (
  messaggio: string,
  ...resto: unknown[]
): Promise<string | undefined> {
  return mostraMessaggio('error', messaggio, resto)
}

// --------------------------------------------------------------------- i file

export async function showOpenDialog (opzioni: OpzioniApertura = {}): Promise<Uri[] | undefined> {
  const proprieta: Array<'openFile' | 'openDirectory' | 'multiSelections'> = []
  // In VS Code `canSelectFiles` non detto vale «sì»: senza questa riga, un
  // dialogo che dichiara solo il titolo non lascerebbe scegliere niente.
  if (opzioni.canSelectFolders) proprieta.push('openDirectory')
  if (opzioni.canSelectFiles ?? !opzioni.canSelectFolders) proprieta.push('openFile')
  if (opzioni.canSelectMany) proprieta.push('multiSelections')

  const padre = finestraPadre()
  const scelte = {
    title: opzioni.title,
    buttonLabel: opzioni.openLabel,
    defaultPath: opzioni.defaultUri?.fsPath,
    properties: proprieta,
    filters: Object.entries(opzioni.filters ?? {}).map(([name, estensioni]) => ({
      name,
      // Electron le vuole senza punto, VS Code le accetta in tutti e due i modi.
      extensions: estensioni.map((pezzo) => pezzo.replace(/^\./, '')),
    })),
  }
  const esito = padre ? await dialog.showOpenDialog(padre, scelte) : await dialog.showOpenDialog(scelte)

  if (esito.canceled || esito.filePaths.length === 0) return undefined
  return esito.filePaths.map((percorso) => Uri.file(percorso))
}

/**
 * Dove salvare un file che deve ancora nascere: il documento di un anno nuovo.
 *
 * Le cartelle prima del file non si creano qui — chi salva sa che cosa sta per
 * scriverci dentro, e crearle da un dialogo annullato lascerebbe in giro
 * cartelle vuote. `createDirectory` è a carico di chi riceve l'Uri.
 */
export async function showSaveDialog (opzioni: OpzioniSalvataggio = {}): Promise<Uri | undefined> {
  const padre = finestraPadre()
  const scelte = {
    title: opzioni.title,
    buttonLabel: opzioni.saveLabel,
    defaultPath: opzioni.defaultUri?.fsPath,
    properties: ['createDirectory' as const],
    filters: Object.entries(opzioni.filters ?? {}).map(([name, estensioni]) => ({
      name,
      // Electron le vuole senza punto, VS Code le accetta in tutti e due i modi.
      extensions: estensioni.map((pezzo) => pezzo.replace(/^\./, '')),
    })),
  }
  const esito = padre ? await dialog.showSaveDialog(padre, scelte) : await dialog.showSaveDialog(scelte)

  if (esito.canceled || !esito.filePath) return undefined
  return Uri.file(esito.filePath)
}

/**
 * Aprire un file. Sul desktop non c'è un editor dove mostrarlo, e il programma
 * di sistema è quel che chi lo chiede si aspetta davvero: `actions/system.ts` la
 * usa su tre file appena esportati — un CSV, un PDF — che si vogliono guardare,
 * non modificare.
 */
export async function showTextDocument (cosa: unknown, _opzioni?: unknown): Promise<void> {
  const uri = cosa instanceof Uri ? cosa : null
  if (uri) await shell.openPath(uri.fsPath)
}

// -------------------------------------------------------------- l'avanzamento

/**
 * Un lavoro lungo con qualcosa da guardare mentre si aspetta.
 *
 * Il compito si esegue e basta: quel che cambia rispetto a VS Code è dove
 * finisce il racconto, che qui è il pannello — `DoveAvanzamento.Notification`
 * là è una nuvoletta, e la nuvoletta del registro è la stessa dei messaggi.
 *
 * Il gettone di annullamento c'è ed è vero, ma per ora nessuno lo tira: la
 * nuvoletta del pannello non ha un bottone per fermare, e darglielo vorrebbe
 * dire un messaggio nuovo nel protocollo. L'unico che lo chiede è `oauth.ts`,
 * che aspetta l'autorizzazione di Microsoft: senza annullamento quell'attesa
 * finisce da sé quando il codice scade. Da rivedere con la fase 5, che è dove
 * l'accesso si guarda per intero.
 */
export async function withProgress<T> (
  opzioni: OpzioniAvanzamento,
  compito: (avanzamento: Avanzamento, annulla: Annullamento) => Promise<T>,
): Promise<T> {
  const origine = new SorgenteAnnullamento()
  if (opzioni.title) notifica('info', opzioni.title)
  const avanzamento: Avanzamento = {
    report ({ message }) {
      if (message) notifica('info', message)
    },
  }
  try {
    return await compito(avanzamento, origine.token)
  } finally {
    origine.dispose()
  }
}

// ------------------------------------------------------------------ le domande

/**
 * Via i segnaposto delle icone.
 *
 * Le etichette di `showQuickPick` in `startup.ts` contengono `$(add)` e
 * `$(copy)`: in VS Code diventano un'iconcina, qui resterebbero scritti, e chi
 * guarda leggerebbe «$(copy) Piano di matematica».
 */
export function senzaSegnaposti (etichetta: string): string {
  return etichetta.replace(/\$\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Quel che la pagina del dialogo riceve: il tipo e i suoi parametri, già ripuliti. */
export type ParametriDialogo =
  | {
    tipo: 'input'
    titolo: string
    invito: string
    valore: string
    segnaposto: string
    password: boolean
  }
  | {
    tipo: 'elenco'
    titolo: string
    segnaposto: string
    voci: Array<{ etichetta: string, descrizione: string, dettaglio: string }>
  }

/** Quel che la pagina risponde. Tutto il resto è rumore e si scarta. */
export type RispostaDialogo =
  | { dialogo: 'conferma', indice?: number, testo?: string }
  | { dialogo: 'annulla' }
  | { dialogo: 'valida', testo: string }
  | { dialogo: 'altezza', valore: number }

function eRisposta (messaggio: unknown): messaggio is RispostaDialogo {
  return typeof messaggio === 'object' && messaggio !== null && 'dialogo' in messaggio
}

let inAscolto = false

/** Le pagine di dialogo vive, per webContents: è così che si sa chi ha risposto. */
const aperti = new Map<number, (risposta: RispostaDialogo) => void>()

function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  // Sullo stesso canale delle finestre del registro, e va bene così:
  // `windows.ts` scarta i mittenti che non conosce, e qui si scartano i suoi.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    if (eRisposta(messaggio)) aperti.get(evento.sender.id)?.(messaggio)
  })
}

/**
 * La pagina del dialogo, servita dal protocollo come ogni altro pezzo dell'app.
 *
 * `dist/` e non `shell/`: il registro chiama così la cartella dei propri
 * bundle, ed è l'unica cartella
 * che il protocollo concede sempre. La pagina sta lì perché esbuild ce la
 * copia.
 */
function indirizzo (parametri: ParametriDialogo): string {
  // Nella query e non in un messaggio: così la pagina ha i suoi parametri al
  // primo disegno, e non c'è un attimo in cui la finestra è vuota.
  return `registro://app/dist/dialog.html?p=${encodeURIComponent(JSON.stringify(parametri))}`
}

/**
 * La finestra di dialogo generica: una sola, parametrizzata dal tipo.
 *
 * Annullare risolve con `null` e mai con un rifiuto — Esc, la X, il bottone:
 * tutti. Tutto il codice chiamante scrive `if (!scelta) return`, e una promessa
 * rifiutata farebbe cadere l'azione con un errore che chi lo legge non sa a che
 * cosa attribuire.
 */
function chiedi (
  parametri: ParametriDialogo,
  larghezza: number,
  valida?: (testo: string) => Promise<string | null | undefined>,
): Promise<RispostaDialogo | null> {
  ascolta()
  const padre = finestraPadre()
  const finestra = new BrowserWindow({
    width: larghezza,
    height: 200,
    parent: padre,
    modal: padre !== undefined,
    // Si mostra quando la pagina ha detto quanto è alta: aperta subito, si
    // vedrebbe prima un rettangolo vuoto e poi il contenuto saltare.
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: parametri.titolo,
    backgroundColor: coloreSfondo(),
    ...icona(),
    webPreferences: {
      ...preferenzeComuni(),
      preload: percorsoPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  chiudiLeVieDiFuga(finestra)
  const contenuti = finestra.webContents.id
  diDialogo.add(contenuti)

  return new Promise<RispostaDialogo | null>((risolvi) => {
    let risolto = false
    const finisci = (risposta: RispostaDialogo | null) => {
      if (risolto) return
      risolto = true
      risolvi(risposta)
      if (!finestra.isDestroyed()) finestra.close()
    }

    aperti.set(contenuti, (risposta) => {
      switch (risposta.dialogo) {
        case 'conferma':
          finisci(risposta)
          break

        case 'annulla':
          finisci(null)
          break

        case 'valida':
          // La validazione sta qui e non nella pagina perché `validateInput` è
          // una funzione del registro: non attraversa l'IPC. Un giro per tasto
          // premuto, dentro la stessa macchina, che è quel che costa tenere il
          // bottone spento finché la data non è una data.
          void (valida ?? (async () => null))(risposta.testo).then((errore) => {
            if (finestra.isDestroyed()) return
            finestra.webContents.send(CANALE, { dialogo: 'errore', messaggio: errore ?? null })
          })
          break

        case 'altezza': {
          // La pagina sa quanto è alta solo dopo essersi disegnata: la finestra
          // si adatta a lei, invece di lasciare un bordo vuoto sotto un dialogo
          // di due righe o tagliare un elenco lungo.
          if (finestra.isDestroyed()) return
          // Il tetto era 620 pixel fissi, e non sapeva niente dello schermo né
          // di «Dimensione testo» di Windows: al 200% un elenco di otto voci
          // arriva oltre, e quel che restava fuori spariva insieme ai pulsanti.
          // Adesso il tetto è lo schermo su cui la finestra si aprirà, meno un
          // margine perché non tocchi i bordi; quel che non ci sta scorre
          // dentro la pagina, che ha il proprio `overflow-y` — vedi
          // `shell/pages/dialog/`.
          const schermo = screen.getDisplayMatching(finestra.getBounds()).workAreaSize.height
          finestra.setContentSize(larghezza, limita(risposta.valore, 120, schermo - 80))
          finestra.center()
          finestra.show()
          break
        }
      }
    })

    // La X, e ogni altra via d'uscita: come Esc.
    finestra.on('closed', () => {
      aperti.delete(contenuti)
      diDialogo.delete(contenuti)
      finisci(null)
    })

    // Una finestra che non si mostra è la cosa peggiore che possa capitare qui:
    // il registro resta fermo su una promessa che nessuno risolverà, e non c'è
    // niente da chiudere. Se la pagina non arriva si rinuncia; se arriva ma non
    // dice quanto è alta — uno sbaglio nel suo script — la si mostra lo stesso,
    // così almeno la si può chiudere.
    finestra.webContents.on('did-fail-load', () => finisci(null))
    finestra.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        if (!finestra.isDestroyed() && !finestra.isVisible()) finestra.show()
      }, 1000)
    })

    void finestra.loadURL(indirizzo(parametri))
  })
}

export async function showInputBox (opzioni: OpzioniInputBox = {}): Promise<string | undefined> {
  const valida = async (testo: string): Promise<string | null | undefined> =>
    opzioni.validateInput ? await opzioni.validateInput(testo) : null

  const risposta = await chiedi(
    {
      tipo: 'input',
      titolo: opzioni.title ?? 'Registro',
      invito: opzioni.prompt ?? '',
      valore: opzioni.value ?? '',
      segnaposto: opzioni.placeHolder ?? '',
      password: Boolean(opzioni.password),
    },
    520,
    valida,
  )
  if (!risposta || risposta.dialogo !== 'conferma' || risposta.testo === undefined) return undefined
  return risposta.testo
}

export async function showQuickPick<T extends VoceScelta> (
  voci: readonly T[] | Promise<readonly T[]>,
  opzioni: OpzioniQuickPick = {},
): Promise<T | undefined> {
  const elenco = await voci
  const risposta = await chiedi(
    {
      tipo: 'elenco',
      titolo: opzioni.title ?? 'Registro',
      segnaposto: opzioni.placeHolder ?? 'Filtra…',
      voci: elenco.map((voce) => ({
        etichetta: senzaSegnaposti(voce.label),
        descrizione: voce.description ?? '',
        dettaglio: voce.detail ?? '',
      })),
    },
    560,
  )
  if (!risposta || risposta.dialogo !== 'conferma' || risposta.indice === undefined) return undefined
  return elenco[risposta.indice]
}

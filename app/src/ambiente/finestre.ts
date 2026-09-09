// I pannelli del registro, che sul desktop sono finestre.
//
// Qui non si adatta il registro a Electron: si dà a `createWebviewPanel` la
// stessa forma che ha in VS Code, sostenuta da una `BrowserWindow` invece che
// da un editor. È la mossa che fa risparmiare tutto il resto del lavoro —
// `pannelli/pannello.ts` e `pannelli/proiezione.ts` girano senza una modifica, e con
// loro la coda delle richieste, la spinta dello stato e la chiusura a catena
// della proiezione, che sono le tre cose difficili del registro.
//
// Le corrispondenze che contano:
//
//   webview.html = …             loadURL('registro://pagina/<id>')
//   webview.postMessage(m)       webContents.send sul canale unico
//   webview.onDidReceiveMessage  ipcMain, filtrato per finestra
//   webview.asWebviewUri(u)      un indirizzo registro://, vedi sotto
//   reveal() / dispose()         show() / close()
//
// L'HTML si serve dal protocollo e non da un `data:` URL, e non è un dettaglio:
// `pannelli/pannello.ts` compone una Content-Security-Policy che nomina
// `webview.cspSource`. Con un `data:` URL l'origine della pagina è opaca, la
// policy non combacia con niente, e la finestra resta bianca senza dire perché.
// Servita da `registro://pagina/<id>` l'origine è vera e la policy funziona.

import { BrowserWindow, ipcMain } from 'electron'

import { dentro, icona, percorsoPreload, radiceApp } from './contesto.js'
import { EventEmitter, type Event } from './eventi.js'
import { coloreSfondo, preferenzeComuni } from './tema.js'
import { Uri } from './uri.js'

/** Il canale unico, nelle due direzioni. Chi ascolta distingue il mittente. */
export const CANALE = 'registro:messaggio'

export interface OpzioniWebview {
  enableScripts?: boolean
  retainContextWhenHidden?: boolean
  localResourceRoots?: Uri[]
}

export interface Webview {
  html: string
  readonly cspSource: string
  /**
   * Le opzioni del pannello. Tipate e non `unknown`: `pannelli/pannello.ts` le rilegge
   * per rifarle con le radici della cartella nuova — `{...options, localResourceRoots}`
   * — e su `unknown` quella riga non compila.
   */
  options: OpzioniWebview
  asWebviewUri (risorsa: Uri): Uri
  postMessage (messaggio: unknown): Promise<boolean>
  onDidReceiveMessage: Event<unknown>
}

export interface WebviewPanel {
  readonly webview: Webview
  readonly viewColumn: number | undefined
  title: string
  iconPath?: Uri
  onDidDispose: Event<void>
  reveal (colonna?: number, senzaFuoco?: boolean): void
  dispose (): void
}

/** Le pagine vive, per id: è di qui che il protocollo prende l'HTML da servire. */
const pagine = new Map<string, VistaWeb>()

/** Le stesse, per finestra: è di qui che si sa a chi consegnare un messaggio. */
const perFinestra = new Map<number, VistaWeb>()

let progressivo = 0
let inAscolto = false

/**
 * L'ascolto dell'IPC, acceso una volta sola.
 *
 * Il filtro per finestra è obbligatorio, non è una raffinatezza: il pannello
 * del registro e quello della proiezione sono due istanze distinte e parlano
 * sullo stesso canale. Senza confrontare `evento.sender.id` ognuna riceverebbe
 * anche le richieste dell'altra, e il registro eseguirebbe due volte quel che
 * gli è stato chiesto una.
 */
function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    perFinestra.get(evento.sender.id)?.riceve(messaggio)
  })
}

class VistaWeb implements Webview {
  /** La policy del registro nomina questa stringa: `registro:` copre ogni indirizzo nostro. */
  readonly cspSource = 'registro:'

  readonly onDidReceiveMessage: Event<unknown>

  readonly #id: string
  readonly #finestra: BrowserWindow
  readonly #emettitore = new EventEmitter<unknown>()

  #html = ''
  #opzioni: OpzioniWebview
  /** La pagina ha finito di caricare: prima di allora i messaggi si mettono da parte. */
  #caricata = false
  #arretrati: unknown[] = []

  constructor (id: string, finestra: BrowserWindow, opzioni: OpzioniWebview) {
    this.#id = id
    this.#finestra = finestra
    this.#opzioni = opzioni
    this.onDidReceiveMessage = this.#emettitore.event

    // I messaggi spediti a pagina non ancora caricata si conservano, come fa
    // VS Code: `pannelli/proiezione.ts` spinge il primo contenuto nel proprio
    // costruttore, cioè prima che la finestra abbia finito di aprirsi, e
    // buttarlo via lascerebbe lo schermo della classe vuoto fino alla prima
    // modifica del registro.
    finestra.webContents.on('did-start-loading', () => {
      this.#caricata = false
    })
    finestra.webContents.on('did-finish-load', () => {
      this.#caricata = true
      const coda = this.#arretrati
      this.#arretrati = []
      for (const messaggio of coda) finestra.webContents.send(CANALE, messaggio)
    })
  }

  get html (): string {
    return this.#html
  }

  set html (nuovo: string) {
    this.#html = nuovo
    void this.#finestra.loadURL(`registro://pagina/${this.#id}`)
  }

  get options (): OpzioniWebview {
    return this.#opzioni
  }

  set options (nuove: OpzioniWebview) {
    this.#opzioni = nuove ?? {}
  }

  /** Le radici concesse a questa pagina. */
  get radici (): Uri[] {
    return this.#opzioni.localResourceRoots ?? []
  }

  /**
   * L'indirizzo con cui la pagina carica un file locale.
   *
   * Due autorità, e la differenza è che una cosa si sposta e l'altra no. Il
   * codice dell'app sta a un posto fisso, e gli basta il percorso relativo
   * alla radice: `registro://app/dist/pannello.js`. I dati stanno dove il
   * docente li tiene — e la cartella cambia quando cambia l'anno — quindi lì
   * ci va il percorso intero: `registro://dati/D:/Registro/2026-2027/foto.png`.
   *
   * La codifica la fa `Uri`, segmento per segmento: codificare l'intera
   * stringa in un colpo solo codificherebbe anche le barre, e il percorso
   * diventerebbe il nome lunghissimo di un file che non esiste.
   */
  asWebviewUri (risorsa: Uri): Uri {
    const base = radiceApp()
    if (dentro(base, risorsa)) {
      const relativo = risorsa.path.slice(base.path.length).replace(/^\//, '')
      return Uri.parse('registro://app').with({ path: `/${relativo}` })
    }
    return Uri.parse('registro://dati').with({ path: risorsa.path })
  }

  async postMessage (messaggio: unknown): Promise<boolean> {
    if (this.#finestra.isDestroyed()) return false
    if (!this.#caricata) {
      this.#arretrati.push(messaggio)
      return true
    }
    this.#finestra.webContents.send(CANALE, messaggio)
    return true
  }

  /** Chiamata dall'ascolto dell'IPC, già filtrata per finestra. */
  riceve (messaggio: unknown): void {
    this.#emettitore.fire(messaggio)
  }

  smaltisci (): void {
    this.#emettitore.dispose()
    this.#arretrati = []
  }
}

class FinestraPannello implements WebviewPanel {
  readonly webview: VistaWeb
  readonly viewColumn: number | undefined
  readonly onDidDispose: Event<void>

  /**
   * L'icona. La si accetta e non la si guarda: quella del registro è un SVG, e
   * `nativeImage` non li legge. L'icona vera della finestra la mette
   * l'impacchettamento (fase 6), dove è un `.ico` e la si sceglie una volta sola.
   */
  iconPath?: Uri

  readonly #finestra: BrowserWindow
  readonly #emettitore = new EventEmitter<void>()
  #chiuso = false

  constructor (
    id: string,
    finestra: BrowserWindow,
    colonna: number | undefined,
    opzioni: OpzioniWebview,
  ) {
    this.#finestra = finestra
    this.viewColumn = colonna
    this.onDidDispose = this.#emettitore.event
    this.webview = new VistaWeb(id, finestra, opzioni)

    pagine.set(id, this.webview)
    perFinestra.set(finestra.webContents.id, this.webview)

    finestra.on('closed', () => {
      pagine.delete(id)
      perFinestra.delete(finestra.webContents.id)
      this.webview.smaltisci()
      this.annuncia()
    })
  }

  get title (): string {
    return this.#finestra.isDestroyed() ? '' : this.#finestra.getTitle()
  }

  set title (nuovo: string) {
    if (!this.#finestra.isDestroyed()) this.#finestra.setTitle(nuovo)
  }

  /**
   * Porta la finestra davanti. La colonna si ignora: è il posto dell'editor
   * dentro la griglia di VS Code, e una finestra non sta in nessuna griglia.
   */
  reveal (_colonna?: number, senzaFuoco?: boolean): void {
    if (this.#finestra.isDestroyed()) return
    if (senzaFuoco) {
      this.#finestra.showInactive()
      return
    }
    this.#finestra.show()
    this.#finestra.focus()
  }

  dispose (): void {
    if (this.#finestra.isDestroyed()) {
      this.annuncia()
      return
    }
    this.#finestra.close()
  }

  /** Una volta sola: `dispose()` e la X portano tutti e due qui. */
  private annuncia (): void {
    if (this.#chiuso) return
    this.#chiuso = true
    this.#emettitore.fire()
  }
}

export function createWebviewPanel (
  _tipo: string,
  titolo: string,
  colonna: unknown,
  opzioni?: unknown,
): WebviewPanel {
  ascolta()
  progressivo += 1
  const id = String(progressivo)

  const finestra = new BrowserWindow({
    width: 1280,
    height: 860,
    title: titolo,
    // Si mostra a contenuto pronto: aperta subito, la finestra lampeggerebbe
    // bianca prima di disegnare il registro. Il colore di fondo copre il resto
    // — il ridimensionamento, e l'istante fra `show()` e la prima pittura.
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    webPreferences: {
      ...preferenzeComuni(),
      preload: percorsoPreload(),
      // Nel registro ci sono nomi di allievi, note personali e valutazioni: la
      // pagina non deve avere Node fra le mani. È la stessa ragione per cui
      // `pannelli/pannello.ts` scrive già `default-src 'none'`.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  finestra.once('ready-to-show', () => finestra.show())

  return new FinestraPannello(
    id,
    finestra,
    typeof colonna === 'number' ? colonna : undefined,
    (opzioni ?? {}) as OpzioniWebview,
  )
}

/** L'HTML di una pagina viva: è quel che il protocollo serve su `registro://pagina/<id>`. */
export function htmlDellaPagina (id: string): string | undefined {
  return pagine.get(id)?.html
}

/**
 * Le cartelle da cui il protocollo può leggere.
 *
 * I bundle dell'app ci sono sempre — è da lì che ogni pagina prende il proprio
 * script — e poi ci sono le radici concesse ai pannelli aperti, prese
 * dall'unione e non pannello per pannello: la richiesta arriva al protocollo
 * senza dire quale finestra l'ha fatta.
 */
export function radiciConcesse (): Uri[] {
  const radici = [Uri.joinPath(radiceApp(), 'dist')]
  for (const vista of pagine.values()) radici.push(...vista.radici)
  return radici
}

import { gestisciStatoInterfaccia } from './uiState.js'
// I pannelli del registro come finestre: `createWebviewPanel` con la forma di
// VS Code, sostenuta da una `BrowserWindow`, così `panels/` gira invariato.
//
//   webview.html = …             loadURL('registro://pagina/<id>')
//   webview.postMessage(m)       webContents.send sul canale unico
//   webview.onDidReceiveMessage  ipcMain, filtrato per finestra
//   webview.asWebviewUri(u)      un indirizzo registro://
//   reveal() / dispose()         show() / close()
//
// L'HTML si serve dal protocollo e non da un `data:` URL, la cui origine opaca
// non combacerebbe con la Content-Security-Policy (`cspSource`).

import { app, BrowserWindow, ipcMain } from 'electron'

import { dentro, icona, radiceApp } from './context.js'
import { postoDi, ricordaPosto } from './placement.js'
import { apriConsole } from './dev.js'
import { EventEmitter, type Event } from './events.js'
import { ALTEZZA_BARRA_TITOLO, coloreSfondo, fasciaDelTema, preferenzeConPonte, ricordaFascia } from './theme.js'
import { chiudiLeVieDiFuga } from './navigation.js'
import { Uri } from './uri.js'
import { CANALE, CANALE_INTERFACCIA } from './channels.js'

interface OpzioniWebview {
  enableScripts?: boolean
  retainContextWhenHidden?: boolean
  localResourceRoots?: Uri[]
}

export interface Webview {
  html: string
  readonly cspSource: string
  /** Le opzioni del pannello, tipate perché `panels/panel.ts` le ricompone. */
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
  /** L'id dei `webContents`, per ritrovare la finestra senza il fuoco; assente nelle prove. */
  readonly idContenuti?: number
  reveal (colonna?: number, senzaFuoco?: boolean): void
  dispose (): void
}

/** Le pagine vive per id, da cui il protocollo prende l'HTML. */
const pagine = new Map<string, VistaWeb>()

/** Le stesse per finestra, per consegnare i messaggi. */
const tipiFinestre = new Map<number, string>()
const perFinestra = new Map<number, VistaWeb>()

let progressivo = 0
let inAscolto = false

/**
 * Accende l'ascolto dell'IPC, una volta. Filtra per `sender.id` perché registro e
 * proiezione condividono il canale. Esportata perché splash e benvenuto, con lo
 * stesso preload, fanno un `sendSync` che deve avere risposta (`null`).
 */
export function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  ipcMain.on(CANALE_INTERFACCIA, (evento, operazione: unknown, valore: unknown) => {
    const tipo = tipiFinestre.get(evento.sender.id)
    const esito = tipo
      ? gestisciStatoInterfaccia(app.getPath('userData'), tipo, operazione, valore)
      : null
    // Solo la lettura arriva con `sendSync`; la scrittura arriva con `send`.
    if (operazione === 'leggi') evento.returnValue = esito
  })
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    perFinestra.get(evento.sender.id)?.riceve(messaggio)
  })
}

class VistaWeb implements Webview {
  /** Nominata dalla policy: `registro:` copre ogni indirizzo nostro. */
  readonly cspSource = 'registro:'

  readonly onDidReceiveMessage: Event<unknown>

  readonly #id: string
  readonly #finestra: BrowserWindow
  readonly #emettitore = new EventEmitter<unknown>()

  #html = ''
  #opzioni: OpzioniWebview
  /** Finché la pagina carica, i messaggi si mettono da parte. */
  #caricata = false
  #arretrati: unknown[] = []

  constructor (id: string, finestra: BrowserWindow, opzioni: OpzioniWebview) {
    this.#id = id
    this.#finestra = finestra
    this.#opzioni = opzioni
    this.onDidReceiveMessage = this.#emettitore.event

    // Come VS Code, si conservano i messaggi mandati prima del caricamento:
    // `panels/projection.ts` spinge il primo contenuto nel costruttore.
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
   * L'indirizzo di un file locale: `registro://app/<relativo>` per l'app,
   * `registro://dati/<percorso intero>` per i dati. `Uri` codifica per segmento.
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

  /** Dall'ascolto dell'IPC, già filtrata per finestra. */
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
  readonly idContenuti: number

  /** Accettata e ignorata: è un SVG, che `nativeImage` non legge; l'icona la mette `icona()`. */
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

    // Preso ora: dentro `closed` la finestra è distrutta e `webContents` solleva.
    const idContenuti = finestra.webContents.id
    this.idContenuti = idContenuti

    // Una pagina caduta si ricarica (richiede lo stato da sé), al massimo tre
    // volte al minuto per non girare all'infinito.
    const ricariche: number[] = []
    finestra.webContents.on('render-process-gone', (_evento, dettagli) => {
      if (dettagli.reason === 'clean-exit' || finestra.isDestroyed()) return
      const ora = Date.now()
      while (ricariche.length > 0 && ora - ricariche[0] > 60_000) ricariche.shift()
      if (ricariche.length >= 3) {
        console.error(`La pagina è caduta di nuovo (${dettagli.reason}): non la ricarico.`)
        return
      }
      ricariche.push(ora)
      console.error(`La pagina è caduta (${dettagli.reason}): la ricarico.`)
      finestra.webContents.reload()
    })

    pagine.set(id, this.webview)
    perFinestra.set(idContenuti, this.webview)

    finestra.on('closed', () => {
      pagine.delete(id)
      perFinestra.delete(idContenuti)
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

  /** Porta la finestra davanti; la colonna (griglia di VS Code) si ignora. */
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

/** L'unico pannello che disegna la propria barra del titolo; gli altri hanno la cornice di sistema. */
const CON_BARRA_PROPRIA = 'registroDocenti.pannello'

/**
 * Le opzioni della cornice. Su macOS si posizionano i semafori; su Windows e
 * Linux i pulsanti arrivano come `titleBarOverlay`, e `autoHideMenuBar` nasconde
 * la barra dei menu (Alt e gli acceleratori funzionano ancora).
 */
function cornice (tipo: string): Record<string, unknown> {
  if (tipo !== CON_BARRA_PROPRIA) return {}
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: (ALTEZZA_BARRA_TITOLO - 16) / 2 },
    }
  }
  return {
    titleBarStyle: 'hidden',
    titleBarOverlay: fasciaDelTema(),
    autoHideMenuBar: true,
  }
}

export function createWebviewPanel (
  tipo: string,
  titolo: string,
  colonna: unknown,
  opzioni?: unknown,
): WebviewPanel {
  ascolta()
  progressivo += 1
  const id = String(progressivo)

  const finestra = new BrowserWindow({
    // Dov'era l'ultima volta, ricordato per tipo di pannello.
    ...postoDi(tipo, { width: 1280, height: 860, minWidth: 720, minHeight: 480 }),
    title: titolo,
    // Si mostra a contenuto pronto, per non lampeggiare bianca.
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    ...cornice(tipo),
    webPreferences: {
      ...preferenzeConPonte(),
      // Il lettore PDF di Chromium, per l'anteprima nella pagina Documenti; la
      // CSP limita comunque a `registro://`.
      plugins: true,
    },
  })
  // Niente navigazione né finestre figlie: vedi `navigation.ts`.
  chiudiLeVieDiFuga(finestra)

  // Perché `theme.ts` ne aggiorni la fascia al cambio di tema.
  if (tipo === CON_BARRA_PROPRIA && process.platform !== 'darwin') ricordaFascia(finestra)

  const idStato = finestra.webContents.id
  tipiFinestre.set(idStato, tipo)
  finestra.once('closed', () => tipiFinestre.delete(idStato))
  // Ingrandita o a schermo intero come la si era lasciata, prima di mostrarla.
  // La proiezione va a schermo intero solo col suo comando, che sa il monitor.
  ricordaPosto(tipo, finestra, { schermoIntero: !tipo.endsWith('proiezione') })
  finestra.once('ready-to-show', () => finestra.show())
  // Solo in sviluppo: vedi `dev.ts`.
  apriConsole(finestra)

  return new FinestraPannello(
    id,
    finestra,
    typeof colonna === 'number' ? colonna : undefined,
    (opzioni ?? {}),
  )
}

/**
 * Se una finestra è un pannello (registro o proiezione) e non del guscio: solo i
 * pannelli sanno disegnare le nuvolette di `dialogs.ts`.
 */
export function eUnPannello (idContenuti: number): boolean {
  return tipiFinestre.has(idContenuti)
}

/** L'HTML che il protocollo serve su `registro://pagina/<id>`. */
export function htmlDellaPagina (id: string): string | undefined {
  return pagine.get(id)?.html
}

/**
 * Le cartelle leggibili dal protocollo: `dist/` e `resources/` sempre, più
 * l'unione delle radici dei pannelli aperti (la richiesta non dice la finestra).
 */
export function radiciConcesse (): Uri[] {
  const radici = [Uri.joinPath(radiceApp(), 'dist'), Uri.joinPath(radiceApp(), 'resources')]
  for (const vista of pagine.values()) radici.push(...vista.radici)
  return radici
}

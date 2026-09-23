import { gestisciStatoInterfaccia } from './uiState.js'
// I pannelli del registro, che sul desktop sono finestre.
//
// Qui non si adatta il registro a Electron: si dà a `createWebviewPanel` la
// stessa forma che ha in VS Code, sostenuta da una `BrowserWindow` invece che
// da un editor. È la mossa che fa risparmiare tutto il resto del lavoro —
// `panels/panel.ts` e `panels/projection.ts` girano senza una modifica, e con
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
// `panels/panel.ts` compone una Content-Security-Policy che nomina
// `webview.cspSource`. Con un `data:` URL l'origine della pagina è opaca, la
// policy non combacia con niente, e la finestra resta bianca senza dire perché.
// Servita da `registro://pagina/<id>` l'origine è vera e la policy funziona.

import { app, BrowserWindow, ipcMain } from 'electron'

import { dentro, icona, percorsoPreload, radiceApp } from './context.js'
import { postoDi, ricordaPosto } from './placement.js'
import { apriConsole } from './dev.js'
import { EventEmitter, type Event } from './events.js'
import { ALTEZZA_BARRA_TITOLO, coloreSfondo, fasciaDelTema, preferenzeComuni, ricordaFascia } from './theme.js'
import { chiudiLeVieDiFuga } from './navigation.js'
import { Uri } from './uri.js'

/** Il canale unico, nelle due direzioni. Chi ascolta distingue il mittente. */
export const CANALE = 'registro:messaggio'

interface OpzioniWebview {
  enableScripts?: boolean
  retainContextWhenHidden?: boolean
  localResourceRoots?: Uri[]
}

export interface Webview {
  html: string
  readonly cspSource: string
  /**
   * Le opzioni del pannello. Tipate e non `unknown`: `panels/panel.ts` le rilegge
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
  /**
   * L'id dei `webContents` della finestra: il nome con cui un comando
   * dell'apparato la ritrova senza passare dal fuoco. Facoltativo perché i
   * pannelli finti delle prove non ce l'hanno. Vedi `apparato.schermoIntero`.
   */
  readonly idContenuti?: number
  reveal (colonna?: number, senzaFuoco?: boolean): void
  dispose (): void
}

/** Le pagine vive, per id: è di qui che il protocollo prende l'HTML da servire. */
const pagine = new Map<string, VistaWeb>()

/** Le stesse, per finestra: è di qui che si sa a chi consegnare un messaggio. */
const tipiFinestre = new Map<number, string>()
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
 *
 * Esportata perché la accenda anche l'avvio, prima del riquadro: splash e
 * benvenuto caricano lo stesso preload, che legge lo stato della pagina con un
 * `sendSync` — e senza nessuno in ascolto quella lettura non ha risposta. A
 * quelle finestre torna `null`, perché non sono pannelli: ma torna.
 */
export function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  ipcMain.on('registro:interfaccia', (evento, operazione: unknown, valore: unknown) => {
    const tipo = tipiFinestre.get(evento.sender.id)
    const esito = tipo
      ? gestisciStatoInterfaccia(app.getPath('userData'), tipo, operazione, valore)
      : null
    // `returnValue` serve solo alla lettura, che parte con `sendSync` una volta
    // sola all'avvio del preload. La scrittura adesso arriva con `send`: su un
    // evento asincrono Electron ignora questo campo, e assegnarlo non costa
    // niente — ma scriverlo qui e non altrove dice quale delle due e' quale.
    if (operazione === 'leggi') evento.returnValue = esito
  })
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
    // VS Code: `panels/projection.ts` spinge il primo contenuto nel proprio
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
   * alla radice: `registro://app/dist/panel.js`. I dati stanno dove il
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
  readonly idContenuti: number

  /**
   * L'icona che il registro chiede per il proprio pannello: la si accetta e non
   * la si guarda. Quella del registro è un SVG, e `nativeImage` non li legge.
   *
   * L'icona vera della finestra è già a posto: la mette `icona()` qui sotto, da
   * `icons/`, e la sceglie una volta sola per tutte le finestre.
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

    // L'id dei `webContents` si prende ora e si tiene: dentro `closed` la
    // finestra è già distrutta, e chiederle `webContents` alza «Object has been
    // destroyed» — un'eccezione non catturata nel processo principale, cioè il
    // riquadro d'errore che compare chiudendo un pannello.
    const idContenuti = finestra.webContents.id
    this.idContenuti = idContenuti

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

/**
 * La finestra che disegna la propria barra del titolo, e le altre.
 *
 * Solo il registro: è l'unica finestra che ha in cima una barra sua — il
 * documento aperto, il menu, la ricerca — e sotto una cornice di sistema
 * quella barra diventava la quarta striscia di un cappello alto mezzo schermo.
 * La proiezione e l'assistente tengono la cornice di sistema: non hanno
 * niente da metterci, e senza pulsanti non si chiuderebbero.
 */
const CON_BARRA_PROPRIA = 'registroDocenti.pannello'

/**
 * Le opzioni della cornice, che sono tre cose diverse su tre sistemi.
 *
 * Su macOS i tre semafori li disegna il sistema e non si tolgono: si dice solo
 * dove metterli, e la barra della pagina si scosta per lasciarli stare (lo fa
 * il CSS, che legge `data-sistema`). Su Windows e Linux i pulsanti arrivano
 * come fascia sopra la pagina — `titleBarOverlay` — e il CSS non ci finisce
 * sotto perché Electron pubblica `env(titlebar-area-*)`.
 *
 * `autoHideMenuBar` è la cintura: con la cornice nascosta Electron disegna
 * comunque la barra dei menu dentro la pagina, e sarebbe una striscia in più
 * proprio quella che si stava togliendo. Nascosta non vuol dire spenta — Alt
 * la fa comparire, e gli acceleratori funzionano lo stesso perché il menu
 * dell'applicazione resta installato: vedi `shell/windows/menu.ts`.
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
    // Dov'era l'ultima volta, se quello schermo c'è ancora. Il tipo del
    // pannello è la chiave: il registro e la proiezione sono due finestre con
    // due mestieri diversi — una sta dove si lavora, l'altra sullo schermo
    // della classe — e ricordarle insieme vorrebbe dire spostarle a vicenda.
    ...postoDi(tipo, { width: 1280, height: 860, minWidth: 720, minHeight: 480 }),
    title: titolo,
    // Si mostra a contenuto pronto: aperta subito, la finestra lampeggerebbe
    // bianca prima di disegnare il registro. Il colore di fondo copre il resto
    // — il ridimensionamento, e l'istante fra `show()` e la prima pittura.
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    // La cornice: nascosta e rifatta dalla pagina per il registro, di sistema
    // per tutte le altre. Vedi `cornice`.
    ...cornice(tipo),
    webPreferences: {
      ...preferenzeComuni(),
      preload: percorsoPreload(),
      // Il lettore di PDF di Chromium, che è quel che disegna l'anteprima nel
      // riquadro della pagina Documenti. Non apre una porta verso l'esterno:
      // la Content-Security-Policy della pagina inquadra solo `registro://`,
      // cioè i file della cartella dei dati.
      plugins: true,
      // Nel registro ci sono nomi di allievi, note personali e valutazioni: la
      // pagina non deve avere Node fra le mani. È la stessa ragione per cui
      // `panels/panel.ts` scrive già `default-src 'none'`.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  // Niente navigazione e niente finestre figlie: il perché sta in
  // `navigation.ts`.
  chiudiLeVieDiFuga(finestra)

  // La fascia dei pulsanti cambia colore con il tema, e a rifargliela è
  // `theme.ts`: qui si dice soltanto che questa finestra ce l'ha.
  if (tipo === CON_BARRA_PROPRIA && process.platform !== 'darwin') ricordaFascia(finestra)

  const idStato = finestra.webContents.id
  tipiFinestre.set(idStato, tipo)
  finestra.once('closed', () => tipiFinestre.delete(idStato))
  // Ingrandita o a schermo intero come la si era lasciata: si dichiara prima di
  // mostrarla, così non si vede la finestra nascere piccola e poi allargarsi.
  // La proiezione fa eccezione sullo schermo intero: là ce la manda il comando,
  // che sa anche su quale monitor.
  ricordaPosto(tipo, finestra, { schermoIntero: !tipo.endsWith('proiezione') })
  finestra.once('ready-to-show', () => finestra.show())
  // In sviluppo la console della pagina si apre da sé: vedi `dev.ts`.
  // Nell'applicazione impacchettata questa riga non fa niente, e la console
  // resta dov'era — nel menu «Visualizza».
  apriConsole(finestra)

  return new FinestraPannello(
    id,
    finestra,
    typeof colonna === 'number' ? colonna : undefined,
    (opzioni ?? {}),
  )
}

/**
 * Il minimo che serve a una finestra che non è un pannello: il canale sincrono
 * delle preferenze locali.
 *
 * Il preload lo interroga appena la pagina nasce — `sendSync('registro:interfaccia',
 * 'leggi')` — e una domanda sincrona senza nessuno che risponda non torna
 * indietro: la pagina resterebbe ferma prima di disegnare la prima riga. Le
 * finestre fatte da `createWebviewPanel` sono già a posto; chi se ne fa una per
 * conto suo — la striscia dell'agenda sul desktop — passa di qui.
 */
export function registraStatoFinestra (finestra: BrowserWindow, tipo: string): void {
  ascolta()
  const idStato = finestra.webContents.id
  tipiFinestre.set(idStato, tipo)
  finestra.once('closed', () => tipiFinestre.delete(idStato))
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

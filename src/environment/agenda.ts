// La finestra del widget: una pagina senza cornice di sistema, appoggiata sul
// desktop.
//
// Qui non si sa niente di lezioni. C'è una finestra, il modo in cui sta sul
// desktop — vedi `anchoring.ts` — e il canale su cui la pagina chiede e
// riceve. Che cosa mostrare lo decide `src/agenda.ts`, che ha in mano
// l'archivio e l'orologio, come succede per l'icona accanto all'orologio: là
// `environment/tray.ts` fa il menu e `src/tray.ts` lo riempie.
//
// ## I due modi, e che cosa cambia
//
// **Libero** è il predefinito: il widget sta dove lo si trascina. Si sposta
// prendendolo per la testata, e si ridimensiona dai bordi.
//
// **Agganciato** (`agenda.ancorata`) lo incolla al bordo destro come una barra
// di sistema: allora — e solo allora — le icone del desktop gli fanno posto e
// le finestre massimizzate si fermano al suo bordo. In cambio il posto non lo
// sceglie più chi trascina.
//
// In tutt'e due i modi misure e posizione scattano sulla griglia delle icone
// del desktop: è la ragione per cui il widget sembra parte della scrivania
// invece di un foglietto appiccicato sopra. Il conto sta nel dominio
// (`celleDaLarghezza` e compagne), il gesto vero in `anchoring.ts`, e qui in
// mezzo c'è l'unica conversione fra i pixel della pagina e quelli di Windows.
//
// ## Perché non passa da `createWebviewPanel`
//
// Perché non è un pannello. I due pannelli del registro sono finestre normali —
// con cornice, ridimensionabili, ricordate dove erano — e questa è l'opposto di
// tutto ciò: senza cornice, senza fuoco, sotto a tutto, e larga un numero
// intero di celle di icone. Passare di là vorrebbe dire aggiungere otto opzioni
// a `windows.ts` per l'unica finestra che le usa.

import { BrowserWindow, ipcMain, screen } from 'electron'

import {
  altezzaDaCelle,
  celleDaAltezza,
  celleDaLarghezza,
  larghezzaDaCelle,
} from '../domain/agenda.js'
import {
  StrisciaAncorata,
  WidgetLibero,
  ancoraggioDisponibile,
  cellaIcone,
  confiniFisici,
  type Rettangolo,
} from './anchoring.js'
import { icona, percorsoPreload } from './context.js'
import { CANALE, registraStatoFinestra } from './windows.js'
import { AmbitoImpostazione, getConfiguration } from './settings.js'
import { chiudiLeVieDiFuga } from './navigation.js'
import { coloreSfondo, preferenzeComuni } from './theme.js'

/** Il tipo della finestra: la chiave con cui la pagina ricorda le sue preferenze. */
const TIPO = 'registroDocenti.agenda'

const CHIAVE_ANCORATA = 'registroDocenti.agenda.ancorata'
const CHIAVE_CELLE = 'registroDocenti.agenda.celle'
const CHIAVE_CELLE_ALTEZZA = 'registroDocenti.agenda.celleAltezza'
const CHIAVE_COLONNA = 'registroDocenti.agenda.colonna'
const CHIAVE_RIGA = 'registroDocenti.agenda.riga'

/** Quante celle alto nasce il widget libero: cinque giorni ci stanno. */
const CELLE_ALTEZZA_LIBERA = 9

/** Le tre schede della striscia. Vedi `src/agenda.ts`, che le riempie. */
export type SchedaAgenda = 'calendario' | 'pendenze' | 'lezione'

/** Quel che la pagina sa fare, tradotto in una parola sola. */
export type ComandoAgenda =
  | { tipo: 'settimana', lunedi: string }
  | { tipo: 'oggi' }
  | { tipo: 'apri', lezioneId: string }
  | { tipo: 'registro' }
  | { tipo: 'apriDocumento' }
  | { tipo: 'chiudi' }
  /** La linguetta premuta: la scheda si ricorda, e riapre dove si era lasciata. */
  | { tipo: 'scheda', scheda: SchedaAgenda }
  /** Le frecce sopra la griglia del mese: `primo` è il primo del mese da mostrare. */
  | { tipo: 'mese', primo: string }
  /** Una casella del mese premuta: la settimana sotto ci si sposta. */
  | { tipo: 'giorno', data: string }
  /** L'ora che la scheda «lezione» tiene sotto gli occhi; `null` torna ad adesso. */
  | { tipo: 'ora', lezioneId: string | null }
  /** Una riga d'appello: tutte le unità didattiche di quella persona insieme. */
  | { tipo: 'presenza', lezioneId: string, allievoId: string, stato: string }
  /** Tutta la classe in un gesto: è come comincia ogni appello. */
  | { tipo: 'presenzeTutti', lezioneId: string, stato: string }
  /** L'argomento battuto a macchina mentre l'ora è ancora in corso. */
  | { tipo: 'argomenti', lezioneId: string, testo: string }
  /** «Fatta»: l'ora si segna svolta, che è l'ultimo gesto che la chiude. */
  | { tipo: 'chiudiOra', lezioneId: string }
  /** Una classe con del lavoro aperto: il registro si apre sulla sua scheda. */
  | { tipo: 'apriPendenze', classeId: string }
  /** Il bordo sinistro trascinato: `x` è dove sta il puntatore, in pixel di Electron. */
  | { tipo: 'larghezza', x: number }
  /** Il bordo di sotto trascinato: `y` è dove sta il puntatore, nelle stesse unità. */
  | { tipo: 'altezza', y: number }
  /** La testata trascinata: dove deve andare l'angolo in alto a sinistra. */
  | { tipo: 'sposta', x: number, y: number }

interface OpzioniAgenda {
  /** Che cosa mandare alla pagina adesso. La chiama la finestra, quando serve. */
  contenuto (): unknown
  alComando (comando: ComandoAgenda): void
  /** Chiamata quando il widget sparisce, comunque sia sparito. */
  allaChiusura (): void
}

export interface FinestraAgenda {
  /** Rimanda il contenuto alla pagina: l'orologio è girato, o il registro è cambiato. */
  aggiorna (): void
  chiudi (): void
}

/** Il widget vivo: uno solo, nell'uno o nell'altro modo. */
type Posa = StrisciaAncorata | WidgetLibero

let corrente: { finestra: BrowserWindow, posa: Posa } | null = null

/**
 * Le finestre che stiamo chiudendo noi.
 *
 * Serve a distinguere «l'ha chiusa il docente» da «la stiamo rifacendo», che
 * dall'evento `closed` si vedono identiche. Senza, cambiare una misura del
 * widget lo faceva sparire per sempre: `chiudiAgenda()` rifà la striscia
 * subito dopo, ma il `closed` della vecchia arrivava **dopo** ed eseguiva
 * `allaChiusura()`, che azzera la striscia — cioè quella nuova, appena aperta.
 */
const chiusureVolute = new WeakSet<BrowserWindow>()
let inAscolto = false

export function agendaAperta (): boolean {
  return corrente !== null && !corrente.finestra.isDestroyed()
}

/** Se su questa macchina il widget si può appoggiare al desktop. */
export function agendaDisponibile (): boolean {
  return ancoraggioDisponibile()
}

function ancorata (): boolean {
  return getConfiguration().get<boolean>(CHIAVE_ANCORATA, false)
}

/** Quante celle largo: quel che si era scelto, o tre, che tengono un orario e una classe. */
function celleScelte (): number {
  return getConfiguration().get<number>(CHIAVE_CELLE, 3)
}

/**
 * Quante celle alto, o zero per «tutto il bordo».
 *
 * Zero è il predefinito dell'agganciato, e non è un numero mancante: una barra
 * agganciata nasce alta quanto il bordo a cui si aggancia. Il widget libero,
 * che un bordo non ce l'ha, parte da un'altezza sua.
 */
function celleAltezzaScelte (): number {
  return getConfiguration().get<number>(CHIAVE_CELLE_ALTEZZA, 0)
}

function ricorda (chiave: string, valore: number | boolean): void {
  // Dimenticare l'altezza di una cella non vale un avviso, ma nemmeno un
  // processo che cade: il file delle impostazioni può essere bloccato.
  getConfiguration().update(chiave, valore, AmbitoImpostazione.Global)
    .catch((errore: unknown) => {
      console.error(`non ho potuto ricordare ${chiave}`, errore)
    })
}

/** Lo schermo del desktop in pixel fisici: è l'unità in cui ragiona l'ancoraggio. */
function schermoFisico (): { larghezza: number, altezza: number } {
  const schermo = confiniFisici()
  return { larghezza: schermo.right - schermo.left, altezza: schermo.bottom - schermo.top }
}

/** Da pixel di Electron a pixel di Windows: l'unica conversione del file. */
function inFisici (valore: number): number {
  return Math.round(valore * screen.getPrimaryDisplay().scaleFactor)
}

function eComando (messaggio: unknown): messaggio is { agenda: ComandoAgenda } {
  return typeof messaggio === 'object' && messaggio !== null && 'agenda' in messaggio
}

/**
 * Dove nasce il widget libero: dove lo si era lasciato, o in alto a destra.
 *
 * Il posto si ricorda in celle e non in pixel — è la stessa griglia delle
 * icone — così un cambio di risoluzione non lo lascia a metà fuori dallo
 * schermo. `-1` vuol dire «mai spostato»: allora si mette in alto a destra, che
 * è dove sta un calendario appeso.
 */
function rettangoloLibero (larghezza: number, altezza: number): Rettangolo {
  const cella = cellaIcone()
  const schermo = confiniFisici()
  const colonna = getConfiguration().get<number>(CHIAVE_COLONNA, -1)
  const riga = getConfiguration().get<number>(CHIAVE_RIGA, -1)

  const left = colonna >= 0
    ? schermo.left + colonna * cella.larghezza
    : schermo.right - larghezza - cella.larghezza
  const top = riga >= 0 ? schermo.top + riga * cella.altezza : schermo.top + cella.altezza

  return { left, top, right: left + larghezza, bottom: top + altezza }
}

/**
 * Apre il widget. `null` se questa macchina non sa appoggiarlo al desktop.
 *
 * Aperto due volte torna quello che c'è già: è uno solo — due strisce agganciate
 * riserverebbero due fette d'area di lavoro, e due widget liberi sarebbero due
 * copie della stessa settimana da spostare a mano.
 */
export function apriAgenda (opzioni: OpzioniAgenda): FinestraAgenda | null {
  if (corrente && !corrente.finestra.isDestroyed()) {
    const gia = corrente
    gia.finestra.showInactive()
    return telecomando(gia.finestra, gia.posa, opzioni)
  }
  if (!ancoraggioDisponibile()) return null

  const cella = cellaIcone()
  const schermo = schermoFisico()
  const alBordo = ancorata()
  const larghezza = larghezzaDaCelle(celleScelte(), cella.larghezza, schermo.larghezza)
  const celleAltezza = celleAltezzaScelte()
  const altezzaLibera = altezzaDaCelle(CELLE_ALTEZZA_LIBERA, cella.altezza, schermo.altezza)
  const altezza = celleAltezza > 0
    ? altezzaDaCelle(celleAltezza, cella.altezza, schermo.altezza)
    : alBordo ? null : altezzaLibera

  const scala = screen.getPrimaryDisplay().scaleFactor
  const finestra = new BrowserWindow({
    // La posizione e la misura vere gliele dà `anchoring.ts` appena attaccato:
    // queste servono solo a non farla nascere grande come uno schermo e poi
    // restringersi sotto gli occhi.
    width: Math.round(larghezza / scala),
    height: Math.round((altezza ?? schermo.altezza) / scala),
    show: false,
    // Senza cornice di sistema: la cornice del widget la disegna la pagina, ed è
    // quella che lo fa sembrare un pezzo del desktop invece di una finestra
    // appoggiata sopra. La barra del titolo, qui, ruberebbe la riga della
    // settimana.
    frame: false,
    // `movable` e `resizable` restano veri, e non è una svista: con `movable:
    // false` Electron rimette la finestra dove crede ogni volta che qualcuno la
    // sposta — e qui chi la sposta è `SetWindowPos` dell'ancoraggio. Senza
    // cornice non ci sono comunque bordi di sistema da trascinare: gli unici
    // gesti sono quelli della pagina.
    movable: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    // Fuori dalla barra delle applicazioni e da Alt+Tab: è un pezzo di
    // scrivania, non una finestra fra cui girare.
    skipTaskbar: true,
    type: 'toolbar',
    // E senza fuoco: premere un'ora non deve togliere il cursore da dove si
    // stava scrivendo, e soprattutto non deve portare il widget davanti alla
    // finestra da cui lo si è premuto. I clic arrivano lo stesso — è la finestra
    // a non attivarsi, non il mouse a essere ignorato.
    focusable: false,
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

  const posa: Posa = alBordo
    ? new StrisciaAncorata(finestra, larghezza, altezza)
    : new WidgetLibero(finestra, rettangoloLibero(larghezza, altezza ?? altezzaLibera))
  corrente = { finestra, posa }

  // Il canale sincrono del preload, che la pagina interroga prima di ogni altra
  // cosa: senza, resterebbe ferma a schermo vuoto.
  registraStatoFinestra(finestra, TIPO)

  const contenuti = finestra.webContents.id
  ascolta()
  pagine.set(contenuti, (comando) => {
    // Le misure e il posto non escono di qui: chi sta più in alto non sa quanto
    // è larga una cella di icone, e non deve saperlo.
    if (comando.tipo === 'larghezza' || comando.tipo === 'altezza' || comando.tipo === 'sposta') {
      sistema(posa, comando)
      return
    }
    opzioni.alComando(comando)
  })

  chiudiLeVieDiFuga(finestra)

  finestra.webContents.on('did-finish-load', () => {
    finestra.webContents.send(CANALE, opzioni.contenuto())
    annunciaMisure(posa)
  })

  finestra.once('ready-to-show', () => {
    // Senza fuoco: il widget compare mentre si sta lavorando su altro, e rubare
    // il fuoco vorrebbe dire interrompere chi scrive.
    finestra.showInactive()
    // L'attacco dopo la comparsa: registrare una finestra nascosta lascia la
    // shell con un'area riservata da nessuno, e per un istante le icone si
    // spostano attorno a una striscia che non si vede.
    posa.avvia()
  })

  finestra.on('closed', () => {
    pagine.delete(contenuti)
    posa.ferma()
    if (corrente?.finestra === finestra) corrente = null
    // Una chiusura voluta da noi non è una rinuncia del docente: chi ci ascolta
    // spegnerebbe l'impostazione, o azzererebbe la striscia che nel frattempo
    // abbiamo già riaperto.
    if (chiusureVolute.has(finestra)) return
    opzioni.allaChiusura()
  })

  void finestra.loadURL('registro://app/dist/agenda.html')

  return telecomando(finestra, posa, opzioni)
}

/** Il poco che chi sta fuori può fare a un widget già aperto. */
function telecomando (
  finestra: BrowserWindow,
  posa: Posa,
  opzioni: OpzioniAgenda,
): FinestraAgenda {
  return {
    aggiorna: () => {
      if (finestra.isDestroyed()) return
      finestra.webContents.send(CANALE, opzioni.contenuto())
    },
    chiudi: () => {
      posa.ferma()
      if (finestra.isDestroyed()) return
      chiusureVolute.add(finestra)
      // `corrente` si azzera **adesso**, non quando arriverà `closed`:
      // `close()` è asincrono, e chi riapre subito dopo — cambiare una misura
      // lo fa — trovava questa finestra ancora viva, si prendeva un telecomando
      // su una finestra che stava morendo e non ne creava una nuova.
      if (corrente?.finestra === finestra) corrente = null
      // `destroy()` e non `close()`: garantisce `closed` senza passare da un
      // giro di `beforeunload` della pagina, che qui non serve a niente — la
      // striscia non ha niente da salvare — e allunga solo l'attesa.
      finestra.destroy()
    },
  }
}

/**
 * Un bordo o la testata trascinati fin qui: quante celle sono, e il widget ci
 * scatta dentro.
 *
 * Le coordinate arrivano in pixel di Electron — quelli che la pagina conosce —
 * e vanno riportate in pixel fisici prima di poterle confrontare con la griglia
 * delle icone, che Windows dichiara nei suoi. Su uno schermo al 100% i due
 * numeri coincidono e non si vede differenza; al 150% confonderli vuol dire un
 * widget largo un terzo in meno di quel che si è trascinato.
 */
function sistema (
  posa: Posa,
  comando:
    | { tipo: 'larghezza', x: number }
    | { tipo: 'altezza', y: number }
    | { tipo: 'sposta', x: number, y: number },
): void {
  // I numeri arrivano dalla pagina, per IPC: il tipo qui sopra è una promessa
  // che nessuno ha controllato. Un `NaN` attraversava tutti i conti e finiva
  // nelle impostazioni come colonna o come numero di celle.
  if ('x' in comando && !Number.isFinite(comando.x)) return
  if ('y' in comando && !Number.isFinite(comando.y)) return
  const cella = cellaIcone()
  const schermo = schermoFisico()
  const libero = posa instanceof WidgetLibero ? posa : null
  // I bordi da cui si misura: per il widget libero i suoi, per la striscia
  // agganciata quelli dello schermo — è al bordo che sta incollata.
  const bordi = libero ? libero.rettangolo : confiniFisici()

  if (comando.tipo === 'sposta') {
    // Solo il widget libero si sposta: quello agganciato sta dove la shell gli
    // ha concesso di stare, e trascinarlo altrove vorrebbe dire scollarlo.
    if (!libero) return
    const desktop = confiniFisici()
    const colonna = Math.max(
      0,
      Math.round((inFisici(comando.x) - desktop.left) / Math.max(1, cella.larghezza)),
    )
    const riga = Math.max(
      0,
      Math.round((inFisici(comando.y) - desktop.top) / Math.max(1, cella.altezza)),
    )
    const sinistra = desktop.left + colonna * cella.larghezza
    const alto = desktop.top + riga * cella.altezza
    if (sinistra === libero.rettangolo.left && alto === libero.rettangolo.top) return

    libero.sposta(sinistra, alto)
    ricorda(CHIAVE_COLONNA, colonna)
    ricorda(CHIAVE_RIGA, riga)
    return
  }

  if (comando.tipo === 'larghezza') {
    // Il bordo destro resta dov'è e si tira quello sinistro.
    const trascinata = Math.max(0, bordi.right - inFisici(comando.x))
    const celle = celleDaLarghezza(trascinata, cella.larghezza, schermo.larghezza)
    const larghezza = larghezzaDaCelle(celle, cella.larghezza, schermo.larghezza)
    if (larghezza === posa.larghezza) return

    posa.ridimensiona({ larghezza })
    ricorda(CHIAVE_CELLE, celle)
    annunciaMisure(posa)
    return
  }

  const trascinata = Math.max(0, inFisici(comando.y) - bordi.top)
  const celle = celleDaAltezza(trascinata, cella.altezza, schermo.altezza)
  const altezza = altezzaDaCelle(celle, cella.altezza, schermo.altezza)
  if (altezza === posa.altezza) return

  // Trascinata fino in fondo, la striscia agganciata torna «alta come il bordo»
  // invece di fermarsi a un numero di celle che per un pelo non ci arriva: è il
  // caso normale di una barra, e deve restare tale anche se domani lo schermo
  // cambia risoluzione. Il widget libero no: lui un'altezza ce l'ha sempre.
  const intera = !libero && altezza >= posa.altezzaMassima - cella.altezza / 2
  posa.ridimensiona({ altezza: intera ? null : altezza })
  ricorda(CHIAVE_CELLE_ALTEZZA, intera ? 0 : celle)
  annunciaMisure(posa)
}

/** Quante celle è grande adesso: il widget lo dice, e la pagina lo scrive in fondo. */
function annunciaMisure (posa: Posa): void {
  if (!corrente || corrente.finestra.isDestroyed()) return
  const cella = cellaIcone()
  corrente.finestra.webContents.send(CANALE, {
    tipo: 'agenda.misure',
    celle: Math.round(posa.larghezza / Math.max(1, cella.larghezza)),
    celleAltezza: Math.round(posa.altezza / Math.max(1, cella.altezza)),
    // La pagina disegna la presa per spostare solo quando c'è qualcosa da
    // spostare: una testata che invita a trascinare una barra incollata al
    // bordo sarebbe una promessa non mantenuta.
    libero: posa instanceof WidgetLibero,
  })
}

/** I widget vivi, per `webContents`: è così che si sa chi ha premuto. */
const pagine = new Map<number, (comando: ComandoAgenda) => void>()

/**
 * L'ascolto del canale, acceso una volta sola.
 *
 * Sullo stesso canale delle altre finestre, come i dialoghi: ognuno scarta i
 * mittenti che non sono suoi, e un canale solo è quel che il preload espone
 * senza dover sapere in che finestra si trova.
 */
function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    if (eComando(messaggio)) pagine.get(evento.sender.id)?.(messaggio.agenda)
  })
}

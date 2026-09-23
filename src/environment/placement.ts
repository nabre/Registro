// Dove stavano le finestre l'ultima volta, e dove si riaprono.
//
// Una finestra che nasce sempre al centro dello schermo principale, larga
// milleduecentottanta, è una finestra da sistemare ogni mattina: chi lavora con
// due schermi tiene il registro su quello grande, chi ne ha uno solo la
// ingrandisce e basta. Erano dieci secondi al giorno spesi a rifare una cosa
// già fatta il giorno prima.
//
// Si ricorda quel che si vede: il posto, la misura, su quale schermo — che nel
// posto ci sta già, perché le coordinate di Electron attraversano tutti gli
// schermi — e se era ingrandita o a schermo intero. Sono tre cose diverse: una
// finestra ingrandita ha comunque delle misure «normali», quelle che ritrova
// premendo il tasto di ripristino, e vanno tenute da parte tutte e due.
//
// Sta in `userData` con le altre preferenze dell'applicazione, e non nella
// cartella dell'anno: dove tenere la finestra è una faccenda di questo
// computer, non di questo registro — lo stesso anno aperto sul portatile e sul
// fisso vuole due posti diversi.
//
// Quel che il file dice non si prende per buono. Gli schermi si staccano: il
// posto di ieri può essere fuori da tutti quelli attaccati adesso, e una
// finestra a meno duemila pixel esiste ma non la vede nessuno — è il modo più
// sicuro di far credere che l'applicazione non si apra. Prima di usarlo si
// controlla che stia ancora dentro uno schermo vero.

import { app, screen, type BrowserWindow } from 'electron'
import { depositoJson } from './jsonStore.js'
import * as percorso from 'node:path'

const NOME_FILE = 'finestre.json'

/**
 * Quanto si aspetta prima di scrivere.
 *
 * Trascinare una finestra fa scattare `move` decine di volte al secondo, e una
 * scrittura su disco per fotogramma sarebbe la cosa più costosa che
 * l'applicazione fa. Si scrive quando la mano si ferma.
 */
const ATTESA_SCRITTURA = 500

/** Quanto di una finestra deve restare su uno schermo perché il posto valga. */
const MINIMO_VISIBILE = 120

/** Il posto di una finestra, com'è scritto nel file. */
interface Posto {
  x: number
  y: number
  larghezza: number
  altezza: number
  /** Ingrandita: le misure qui sopra sono quelle a cui torna ripristinandola. */
  massimizzata?: boolean
  schermoIntero?: boolean
}

/** Le misure con cui nasce una finestra che non si è mai vista. */
export interface Misure {
  width: number
  height: number
  minWidth?: number
  minHeight?: number
}

let orologio: ReturnType<typeof setTimeout> | null = null

/**
 * I posti cambiati da quando si è scritto l'ultima volta.
 *
 * Non basta cambiarli in memoria e ripassare l'oggetto al deposito: fra il
 * cambiamento e la scrittura c'è la rilettura che ricontrolla se il file era
 * bloccato, e quella rilettura **sostituisce** quel che c'è in memoria. Quel
 * che si è segnato nel frattempo va tenuto a parte e rimesso sopra al momento
 * di scrivere, o si scriverebbe la fotografia di prima al posto di tutto il
 * resto.
 */
const daScrivere = new Map<string, Posto>()

function file (): string {
  return percorso.join(app.getPath('userData'), NOME_FILE)
}

// Non aver potuto ricordare dov'era una finestra non ferma niente, ma non
// deve nemmeno cancellare i posti delle altre: se il file c'è e non si legge,
// `depositoJson` lo lascia stare invece di riscriverlo vuoto.
const deposito = depositoJson<Record<string, Posto>>(
  file,
  (letto) =>
    letto !== null && typeof letto === 'object' ? { ...(letto as Record<string, Posto>) } : {},
  () => ({}),
)

function caricati (): Record<string, Posto> {
  return deposito.contenuto()
}

/**
 * Scrive, ma non subito e non dove si legge.
 *
 * Prima in un file accanto e poi al posto suo, come le altre preferenze: un
 * arresto a metà scrittura lascerebbe un JSON tagliato, e al riavvio dopo il
 * salvataggio le finestre tornerebbero tutte al centro senza che si capisca
 * perché.
 */
function programmaScrittura (): void {
  if (orologio) clearTimeout(orologio)
  orologio = setTimeout(scrivi, ATTESA_SCRITTURA)
}

function scrivi (): void {
  if (orologio) {
    clearTimeout(orologio)
    orologio = null
  }
  if (daScrivere.size === 0) return
  const cambiati = Object.fromEntries(daScrivere)
  daScrivere.clear()
  try {
    deposito.salva((attuale) => ({ ...attuale, ...cambiati }))
  } catch {
    // Alla prossima apertura la finestra sarà al centro: non è un motivo per
    // fermare niente.
  }
}

/** Rilegge il file. Serve alle prove, che scrivono in una `userData` loro. */
export function ricaricaPosti (): void {
  deposito.dimentica()
}

/**
 * Lo schermo attaccato adesso che ospita un posto, o `null` se non ce n'è uno.
 *
 * Basta che ne resti un pezzo afferrabile: una finestra spostata per metà fuori
 * dal bordo è una scelta di chi lavora, e rimetterla a posto da soli sarebbe
 * un'ingerenza. Quel che non si accetta è la finestra intera fuori da tutti gli
 * schermi, che è quel che resta staccando il monitor di casa.
 */
function schermoDi (posto: Posto): Electron.Rectangle | null {
  for (const schermo of screen.getAllDisplays()) {
    const area = schermo.workArea
    const largo = Math.min(posto.x + posto.larghezza, area.x + area.width) - Math.max(posto.x, area.x)
    const alto = Math.min(posto.y + posto.altezza, area.y + area.height) - Math.max(posto.y, area.y)
    if (largo >= MINIMO_VISIBILE && alto >= MINIMO_VISIBILE) return area
  }
  return null
}

/**
 * Le opzioni con cui aprire una finestra: il posto di ieri se vale ancora,
 * altrimenti le misure di sempre.
 *
 * Il risultato si sparge nelle opzioni di `BrowserWindow`, che è dove le
 * coordinate vanno dette: assegnarle dopo, con `setBounds`, farebbe nascere la
 * finestra al centro e saltare al posto suo un istante dopo.
 */
export function postoDi (nome: string, misure: Misure): Misure & { x?: number, y?: number } {
  const posto = caricati()[nome]
  const schermo = posto ? schermoDi(posto) : null
  if (!posto || !schermo) return misure

  // Mai più grande dello schermo che la ospita: un posto scritto sul monitor
  // grande dell'ufficio, riaperto sul portatile, darebbe una finestra con i
  // bordi fuori dallo schermo — e il bordo di sotto è quello da cui si
  // ridimensiona.
  const larghezza = Math.min(Math.round(posto.larghezza), schermo.width)
  const altezza = Math.min(Math.round(posto.altezza), schermo.height)

  return {
    ...misure,
    x: Math.round(posto.x),
    y: Math.round(posto.y),
    // Mai più piccola del minimo dichiarato: un posto scritto da una versione
    // di prima potrebbe essere più stretto di quanto la pagina sappia stare.
    width: Math.max(larghezza, misure.minWidth ?? 0),
    height: Math.max(altezza, misure.minHeight ?? 0),
  }
}

/**
 * Tiene il conto di dove sta una finestra, e le ridà lo stato in cui era
 * chiusa.
 *
 * Le misure le ha già portate `postoDi` nel costruttore; qui restano le due
 * cose che si possono chiedere solo a finestra nata — ingrandita, a schermo
 * intero — e gli ascolti che aggiornano il file mentre si lavora.
 *
 * `getNormalBounds` e non `getBounds`: a finestra ingrandita la seconda dà le
 * misure dello schermo, e ripristinandola al riavvio si troverebbe una finestra
 * grande come il monitor ma non ingrandita, senza più memoria di quanto fosse
 * prima.
 */
export function ricordaPosto (
  nome: string,
  finestra: BrowserWindow,
  opzioni: {
    /**
     * Se riaprire a schermo intero una finestra chiusa così.
     *
     * Spento per la proiezione: lì a schermo intero ci va il comando, e sullo
     * schermo della classe — una finestra che nasce già intera sul monitor del
     * docente non si sposta più, e il registro resterebbe coperto dalla
     * proiezione appena accesa.
     */
    schermoIntero?: boolean
  } = {},
): void {
  const posto = caricati()[nome]
  if (posto?.massimizzata) finestra.maximize()
  if (posto?.schermoIntero && opzioni.schermoIntero !== false) finestra.setFullScreen(true)

  const segna = (): void => {
    if (finestra.isDestroyed()) return
    const misure = finestra.getNormalBounds()
    const posto: Posto = {
      x: misure.x,
      y: misure.y,
      larghezza: misure.width,
      altezza: misure.height,
      massimizzata: finestra.isMaximized(),
      schermoIntero: finestra.isFullScreen(),
    }
    // In memoria perché chi riapre una finestra nello stesso istante veda il
    // posto nuovo; in `daScrivere` perché sopravviva alla rilettura.
    caricati()[nome] = posto
    daScrivere.set(nome, posto)
    programmaScrittura()
  }

  finestra.on('resize', segna)
  finestra.on('move', segna)
  finestra.on('maximize', segna)
  finestra.on('unmaximize', segna)
  finestra.on('enter-full-screen', segna)
  finestra.on('leave-full-screen', segna)
  // Alla chiusura si segna e si scrive subito: l'attesa che risparmia le
  // scritture durante il trascinamento, qui, farebbe perdere proprio l'ultimo
  // posto — quello che si vuole ritrovare.
  finestra.on('close', () => {
    segna()
    scrivi()
  })
}

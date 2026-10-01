// La finestra su un elenco lungo: si disegna quel che si vede, più un margine,
// e al posto del resto un vuoto della sua misura (ADR-50, passo 5).
//
// La libreria (@tanstack/virtual-core) sta tutta qui dietro: chi disegna una
// tabella o un elenco chiede a `finestra()` quali indici disegnare e dove
// mettere i vuoti, e non sa chi fa il conto. Cambiarla tocca questo file solo.
//
// Il disegno resta funzione dello stato (ADR-06). Quel che la finestra
// aggiunge è la posizione della scatola che scorre: quando lo scorrimento o la
// misura cambiano gli indici, si rifà solo l'isola che contiene l'elenco
// (`isolaVirtuale`), con il morph di `aggiornaElemento`. Ogni voce disegnata
// porta la sua chiave (`data-chiave`): una colonna che scivola di posto resta
// lo stesso nodo, e un campo con il fuoco non diventa la casella di un altro.
//
// Sotto una soglia di voci la finestra si spegne e si disegna tutto: le tabelle di
// tutti i giorni restano come sono, con la ricerca del browser che le trova.

import {
  Virtualizer,
  elementScroll,
  measureElement,
  observeElementOffset,
  observeElementRect,
  type VirtualizerOptions,
} from '@tanstack/virtual-core'

import type { Attributi, Figlio } from '#ui/pannello/dom.js'
import { isola, ridisegnaIsola, rifaiIsolaAdesso } from '#ui/pannello/islands.js'

/**
 * Da quante voci in su si disegna solo la finestra, se l'elenco non dice
 * altro (`soglia`). Sotto, il costo di tutto è piccolo
 * (`tests/interfaccia/misure.spec.ts`) e la finestra toglierebbe la ricerca
 * del browser senza dare niente.
 */
const SOGLIA = 60

interface OpzioniFinestra {
  /** Unica nella pagina: dice quale elenco è, e dà il nome alla sua isola. */
  chiave: string
  /** Quante voci ha l'elenco intero. */
  conto: number
  /** In larghezza (le colonne di una matrice) o in altezza (le righe). */
  orizzontale?: boolean
  /** Quanto misura, a occhio, la voce: finché non la si è disegnata vale questo. */
  stima: (indice: number) => number
  /** La chiave stabile della voce: la misura presa resta sua anche se l'elenco cambia. */
  chiaveDi: (indice: number) => string
  /**
   * Come si misura una voce disegnata; di norma il suo riquadro. Serve a chi
   * ha margini che il riquadro non conta.
   */
  misura?: (elemento: HTMLElement) => number
  /**
   * Indici da disegnare sempre, oltre a quel che si vede: l'intestazione del
   * gruppo della prima voce in vista, che resta appiccicata in cima.
   */
  sempre?: (indici: number[]) => number[]
  /** Quante voci in più per parte, perché scorrendo non si veda il vuoto. */
  oltre?: number
  /**
   * Da quante voci in su si disegna solo la finestra (di norma `SOGLIA`). Una
   * colonna di matrice pesa quanto le sue righe: lì la soglia è più bassa.
   */
  soglia?: number
}

/** Un pezzo del disegno: una voce, o il vuoto che sta al posto di quelle saltate. */
type Pezzo = { indice: number, vuoto?: undefined } | { vuoto: number, indice?: undefined }

export interface Finestra {
  /** Falso sotto `SOGLIA`: allora `pezzi` sono tutte le voci, senza vuoti. */
  attiva: boolean
  conto: number
  /**
   * Il disegno in ordine. Con la finestra attiva il primo pezzo è sempre un
   * vuoto (anche di zero), che porta `inizio`: da lì si misura dove comincia
   * l'elenco nella scatola.
   */
  pezzi: Pezzo[]
  /**
   * Il `dataset` della voce: l'indice, e la chiave per il morph se la voce ha
   * il fuoco (vedi `finestra`).
   */
  voce: (indice: number) => Record<string, string>
  /** Come `voce`, per l'elemento che dà la misura (la riga di un elenco). */
  misurata: (indice: number) => Record<string, string>
  /** L'elemento che dà la misura in una tabella: la `th` della colonna, mai con la chiave. */
  testata: (indice: number) => Record<string, string>
  /** Il `dataset` del primo vuoto. */
  inizio: Record<string, string>
  /**
   * Porta la voce nel disegno subito, prima di darle il fuoco: la tastiera va
   * dove il puntatore non è ancora arrivato. Torna falso fuori dai bordi.
   */
  portaInVista: (indice: number) => boolean
}

/** Tutto quel che una finestra ricorda fra un disegno e l'altro. */
interface Stato {
  opzioni: OpzioniFinestra
  calcolo: Virtualizer<HTMLElement, HTMLElement>
  /** Gli indici dell'ultimo disegno, per non rifare l'isola se non cambiano. */
  disegnati: string
  /** Indici chiesti da `portaInVista` per il prossimo disegno. */
  chiesti: Set<number>
  /** Un controllo dopo il disegno è già in coda. */
  inCoda: boolean
  /** Si sta disegnando: gli avvisi della libreria in quel mentre non contano. */
  disegnando: boolean
}

const finestre = new Map<string, Stato>()

/** Il nome dell'isola dell'elenco: una sola per chiave. */
function nomeIsola (chiave: string): string {
  // testo-fisso: chiave dell'isola, non si legge
  return `virtuale:${chiave}`
}

/** Il contenitore dell'isola nel documento, se c'è. */
function contenitore (chiave: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-isola="${CSS.escape(nomeIsola(chiave))}"]`)
}

/**
 * La scatola che scorre davvero, cercata salendo dal contenitore: la stessa
 * matrice scorre dentro di sé in una pagina e nel riquadro intorno in un'altra
 * (l'archivio, con o senza foglio aperto).
 */
function scatola (stato: Stato): HTMLElement | null {
  const proprieta = stato.opzioni.orizzontale ? 'overflowX' : 'overflowY'
  for (let su = contenitore(stato.opzioni.chiave)?.parentElement; su; su = su.parentElement) {
    const modo = getComputedStyle(su)[proprieta]
    if (modo === 'auto' || modo === 'scroll') return su
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null
}

/** Lo scorrimento della scatola lungo l'asse della finestra. */
function scorso (stato: Stato, dove: HTMLElement): number {
  return stato.opzioni.orizzontale ? dove.scrollLeft : dove.scrollTop
}

function opzioniDellaLibreria (stato: Stato, margine: number): VirtualizerOptions<HTMLElement, HTMLElement> {
  const o = stato.opzioni
  return {
    count: o.conto,
    horizontal: o.orizzontale ?? false,
    estimateSize: (indice) => o.stima(indice),
    getItemKey: (indice) => o.chiaveDi(indice),
    overscan: o.oltre ?? 4,
    scrollMargin: margine,
    indexAttribute: 'data-virtuale-indice',
    getScrollElement: () => scatola(stato),
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    measureElement: (elemento, voce, calcolo) =>
      stato.opzioni.misura ? stato.opzioni.misura(elemento) : measureElement(elemento, voce, calcolo),
    // Prima di misurare la scatola: la finestra intera, così il primo disegno
    // di una pagina nuova non è vuoto.
    initialRect: { width: window.innerWidth, height: window.innerHeight },
    initialOffset: () => {
      const dove = scatola(stato)
      return dove ? scorso(stato, dove) : 0
    },
    onChange: () => {
      if (!stato.disegnando) controlla(stato)
    },
  }
}

/** L'indice della voce che ha il fuoco, se è di questa finestra. */
function colFuoco (stato: Stato): number | null {
  const attivo = document.activeElement
  if (!(attivo instanceof HTMLElement)) return null
  const voce = attivo.closest<HTMLElement>('[data-virtuale-indice]')
  if (!voce || voce.dataset.virtuale !== stato.opzioni.chiave) return null
  const indice = Number(voce.dataset.virtualeIndice)
  return Number.isInteger(indice) ? indice : null
}

/**
 * Gli indici da disegnare: quelli in vista con il margine, più quello col
 * fuoco (sparito, porterebbe via quel che si sta scrivendo), quelli chiesti
 * dalla tastiera e quelli che l'elenco vuole sempre.
 */
function indici (stato: Stato): number[] {
  const { calcolo, opzioni } = stato
  const insieme = new Set(calcolo.getVirtualIndexes())
  // Una scatola senza misura (nascosta, o non ancora nel documento): le prime.
  if (insieme.size === 0) {
    for (let i = 0; i < Math.min(opzioni.conto, 2 * (opzioni.oltre ?? 4) + 12); i += 1) insieme.add(i)
  }
  const fuoco = colFuoco(stato)
  if (fuoco !== null) insieme.add(fuoco)
  for (const chiesto of stato.chiesti) insieme.add(chiesto)
  const ordinati = [...insieme].filter((i) => i >= 0 && i < opzioni.conto).sort((a, b) => a - b)
  if (!opzioni.sempre) return ordinati
  const tutti = new Set([...ordinati, ...opzioni.sempre(ordinati)])
  return [...tutti].filter((i) => i >= 0 && i < opzioni.conto).sort((a, b) => a - b)
}

/** Se lo scorrimento o una misura hanno cambiato gli indici, si rifà l'isola. */
function controlla (stato: Stato): void {
  // L'elenco non è più nella pagina: si stacca dalla scatola, che può restare
  // (`main.contenuto` è di tutte le pagine) e misurarsi vuota. Le misure prese
  // restano, per quando si torna.
  if (!contenitore(stato.opzioni.chiave)) {
    stato.calcolo._didMount()()
    return
  }
  if (indici(stato).join(',') !== stato.disegnati) ridisegnaIsola(nomeIsola(stato.opzioni.chiave))
}

/**
 * Dopo il disegno, a documento aggiornato: aggancia la scatola (nuova se si è
 * cambiata pagina), prende dove comincia l'elenco dentro di lei e misura le
 * voci disegnate. Se qualcosa sposta gli indici, `controlla` rifà l'isola.
 */
function dopoIlDisegno (stato: Stato): void {
  stato.inCoda = false
  const { calcolo, opzioni } = stato
  if (finestre.get(opzioni.chiave) !== stato) return
  const dentro = contenitore(opzioni.chiave)
  if (!dentro) {
    smonta(opzioni.chiave)
    return
  }
  calcolo._willUpdate()
  const dove = calcolo.scrollElement
  if (!dove) return
  // Lo scorrimento rimesso da `ripristinaScorrimenti` non manda un evento in
  // tempo: lo si legge.
  calcolo.scrollOffset = scorso(stato, dove)
  const inizio = dove.querySelector<HTMLElement>(`[data-virtuale-inizio="${CSS.escape(opzioni.chiave)}"]`)
  if (inizio) {
    const suo = inizio.getBoundingClientRect()
    const sua = dove.getBoundingClientRect()
    const margine = Math.round(opzioni.orizzontale
      ? suo.left - sua.left - dove.clientLeft + dove.scrollLeft
      : suo.top - sua.top - dove.clientTop + dove.scrollTop)
    if (Math.abs(margine - calcolo.options.scrollMargin) > 1) {
      calcolo.setOptions(opzioniDellaLibreria(stato, margine))
    }
  }
  for (const elemento of dove.querySelectorAll<HTMLElement>(
    `[data-virtuale="${CSS.escape(opzioni.chiave)}"][data-virtuale-misura]`,
  )) {
    calcolo.measureElement(elemento)
  }
  // Scorda le voci uscite dal documento.
  calcolo.measureElement(null)
  controlla(stato)
}

/** Stacca la finestra dalla sua scatola e la scorda. */
function smonta (chiave: string): void {
  const stato = finestre.get(chiave)
  if (!stato) return
  finestre.delete(chiave)
  stato.calcolo._didMount()()
}

/** I pezzi del disegno dalle posizioni che la libreria ha calcolato. */
function pezziDi (stato: Stato, scelti: number[]): Pezzo[] {
  const posizioni = stato.calcolo.measurementsCache
  const partenza = stato.calcolo.options.scrollMargin
  const pezzi: Pezzo[] = []
  let arrivato = partenza
  for (const indice of scelti) {
    const posto = posizioni[indice]
    if (!posto) continue
    if (pezzi.length === 0 || posto.start > arrivato) pezzi.push({ vuoto: Math.max(0, posto.start - arrivato) })
    pezzi.push({ indice })
    arrivato = posto.end
  }
  if (pezzi.length === 0) pezzi.push({ vuoto: 0 })
  const fine = posizioni.at(-1)?.end ?? arrivato
  if (fine > arrivato) pezzi.push({ vuoto: fine - arrivato })
  return pezzi
}

/**
 * Quel che l'elenco deve disegnare adesso. Si chiama dentro il disegno
 * dell'isola (`isolaVirtuale`): ogni volta che l'isola si rifà, rilegge
 * scorrimento e misure.
 */
export function finestra (opzioni: OpzioniFinestra): Finestra {
  const chiave = opzioni.chiave
  const attiva = opzioni.conto > (opzioni.soglia ?? SOGLIA)
  const stato = attiva ? finestre.get(chiave) : undefined
  const fuoco = stato ? colFuoco(stato) : null
  // La chiave (`data-chiave`, un `id` per `idiomorph`) solo sulla voce col
  // fuoco: scorrendo cambia posto fra i fratelli, e presa per posizione
  // diventerebbe la casella accanto, con quel che vi si sta scrivendo. Le altre
  // si rimodellano per posizione: con la chiave `idiomorph` le sposterebbe
  // con `moveBefore`, e spostare così la `th` di una tabella fa cadere
  // Chromium 152 (Electron) e 153 (`tests/interfaccia/finestra.spec.ts`, in fondo a destra).
  const voce = (indice: number): Record<string, string> => ({
    virtuale: chiave,
    virtualeIndice: String(indice),
    ...(indice === fuoco ? { chiave: `${chiave}:${opzioni.chiaveDi(indice)}` } : {}),
  })
  const base = {
    conto: opzioni.conto,
    voce,
    misurata: (indice: number) => ({ ...voce(indice), virtualeMisura: '' }),
    testata: (indice: number) => ({ virtuale: chiave, virtualeIndice: String(indice), virtualeMisura: '' }),
    inizio: { virtualeInizio: chiave },
  }

  if (!attiva) {
    smonta(chiave)
    return {
      ...base,
      attiva: false,
      pezzi: Array.from({ length: opzioni.conto }, (_, indice) => ({ indice })),
      portaInVista: (indice) => indice >= 0 && indice < opzioni.conto,
    }
  }

  let corrente = stato
  if (!corrente) {
    const nuovo: Stato = {
      opzioni,
      calcolo: undefined as unknown as Virtualizer<HTMLElement, HTMLElement>,
      disegnati: '',
      chiesti: new Set(),
      inCoda: false,
      disegnando: false,
    }
    nuovo.calcolo = new Virtualizer(opzioniDellaLibreria(nuovo, 0))
    // Una voce sopra la vista misurata diversa dalla stima non sposta lo
    // scorrimento: la libreria lo farebbe per tenere ferma la vista, ma in fondo
    // all'elenco, dove non può scendere, la correzione rimandata diventava una
    // deriva verso l'alto a ogni fotogramma. Con stime giuste il salto è di
    // qualche pixel, e solo tornando dove non si era mai stati.
    nuovo.calcolo.shouldAdjustScrollPositionOnItemSizeChange = () => false
    finestre.set(chiave, nuovo)
    corrente = nuovo
  }
  corrente.opzioni = opzioni
  // Tornando su una pagina la scatola è nuova e parte dall'inizio: lo
  // scorrimento di quella di prima disegnerebbe le colonne sbagliate. Se va
  // rimesso, lo rimette `ripristinaScorrimenti` e lo legge `dopoIlDisegno`.
  if (corrente.calcolo.scrollOffset !== null && !corrente.calcolo.scrollElement?.isConnected) {
    corrente.calcolo.scrollOffset = 0
  }
  corrente.disegnando = true
  let scelti: number[]
  try {
    corrente.calcolo.setOptions(opzioniDellaLibreria(corrente, corrente.calcolo.options.scrollMargin))
    scelti = indici(corrente)
  } finally {
    corrente.disegnando = false
  }
  corrente.chiesti.clear()
  corrente.disegnati = scelti.join(',')
  if (!corrente.inCoda) {
    corrente.inCoda = true
    // Dopo il disegno intero: il contenitore nuovo è entrato nel documento e
    // lo scorrimento è stato rimesso.
    queueMicrotask(() => dopoIlDisegno(corrente))
  }

  return {
    ...base,
    attiva: true,
    pezzi: pezziDi(corrente, scelti),
    portaInVista: (indice) => {
      if (indice < 0 || indice >= corrente.opzioni.conto) return false
      if (corrente.disegnati.split(',').includes(String(indice))) return true
      corrente.chiesti.add(indice)
      rifaiIsolaAdesso(nomeIsola(chiave))
      return true
    },
  }
}

/**
 * L'isola che contiene l'elenco: lo scorrimento rifà lei sola. `disegna` deve
 * chiamare `finestra()` con la stessa chiave.
 */
export function isolaVirtuale (chiave: string, disegna: () => Figlio, attributi: Attributi = {}): HTMLElement {
  return isola(nomeIsola(chiave), disegna, attributi)
}

/**
 * Rifà adesso l'isola dell'elenco, per chi ne cambia il contenuto senza
 * passare dallo stato (la ricerca delle persone, a ogni lettera).
 */
export function rifaiElenco (chiave: string): void {
  rifaiIsolaAdesso(nomeIsola(chiave))
}

/** Lo stile di un vuoto lungo l'asse: niente bordo né margine, solo la misura. */
export function stileVuoto (vuoto: number, orizzontale: boolean): string {
  return orizzontale
    // testo-fisso: CSS
    ? `width:${vuoto}px;min-width:${vuoto}px;max-width:${vuoto}px;padding:0;border:0`
    // testo-fisso: CSS
    : `height:${vuoto}px;padding:0;margin:0;border:0`
}

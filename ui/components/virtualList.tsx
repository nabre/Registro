// La finestra su un elenco lungo in React (ADR-50 passo 5, ADR-56): si disegna
// quel che si vede, più un margine, e al posto del resto un vuoto della sua
// misura. La libreria (@tanstack/virtual-core) sta tutta qui dietro: chi
// disegna una tabella o un elenco chiede a `useFinestra` quali indici disegnare
// e dove mettere i vuoti, e non sa chi fa il conto. Sotto una soglia di voci la
// finestra si spegne e si disegna tutto, con la ricerca del browser che trova
// ogni riga.
//
// Il componente che chiama `useFinestra` fa da isola: lo scorrimento e le
// misure che cambiano gli indici rifanno lui solo, e risponde alla chiave
// d'isola `virtuale:<chiave>`, che `rifaiElenco` rifà.
// Le voci si disegnano con `key={f.chiave(indice)}`: una colonna che scivola di
// posto resta lo stesso nodo, e un campo con il fuoco non diventa la casella di
// un altro.

import {
  Virtualizer,
  elementScroll,
  measureElement,
  observeElementOffset,
  observeElementRect,
  type VirtualizerOptions,
} from '@tanstack/virtual-core'
import {
  useCallback,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type ReactElement,
} from 'react'
import { flushSync } from 'react-dom'

import { iscriviIsola, ridisegnaIsola, rifaiIsolaAdesso } from '#ui/islands.js'


/**
 * Da quante voci in su si disegna solo la finestra, se l'elenco non dice
 * altro (`soglia`). Sotto, il costo di tutto è piccolo
 * (`tests/interfaccia/misure.spec.ts`) e la finestra toglierebbe la ricerca
 * del browser senza dare niente.
 */
const SOGLIA = 60

export interface OpzioniFinestra {
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

/** Gli attributi `data-` di una voce, da spargere sull'elemento: `<td {...f.voce(i)}>`. */
export interface DatiVoce {
  'data-virtuale': string
  'data-virtuale-indice': string
  'data-virtuale-misura'?: ''
  'data-chiave'?: string
}

export interface Finestra {
  /** Falso sotto la soglia: allora `pezzi` sono tutte le voci, senza vuoti. */
  attiva: boolean
  conto: number
  /**
   * Il disegno in ordine. Con la finestra attiva il primo pezzo è sempre un
   * vuoto (anche di zero), che porta `inizio`: da lì si misura dove comincia
   * l'elenco nella scatola.
   */
  pezzi: Pezzo[]
  /** La `key` di React della voce: la sua chiave stabile, non il posto. */
  chiave: (indice: number) => string
  /** Gli attributi della voce: l'indice, e `data-chiave` se ha il fuoco. */
  voce: (indice: number) => DatiVoce
  /** Come `voce`, per l'elemento che dà la misura (la riga di un elenco). */
  misurata: (indice: number) => DatiVoce
  /** L'elemento che dà la misura in una tabella: la `th` della colonna, mai con la chiave. */
  testata: (indice: number) => DatiVoce
  /** Gli attributi del primo vuoto. */
  inizio: { 'data-virtuale-inizio': string }
  /**
   * Porta la voce nel disegno subito, prima di darle il fuoco: la tastiera va
   * dove il puntatore non è ancora arrivato. Torna falso fuori dai bordi.
   */
  portaInVista: (indice: number) => boolean
  /**
   * Il `ref` del contenitore dell'elenco (quel che prima era l'isola): la
   * scatola che scorre si cerca dal suo genitore in su. Senza, si parte dal
   * primo vuoto.
   */
  radice: (nodo: HTMLElement | null) => void
}

/** Tutto quel che una finestra ricorda fra un disegno e l'altro. */
interface Stato {
  opzioni: OpzioniFinestra
  calcolo: Virtualizer<HTMLElement, HTMLElement>
  /** Gli indici dell'ultimo disegno, per non rifare l'elenco se non cambiano. */
  disegnati: string
  /** Indici chiesti da `portaInVista` per il prossimo disegno. */
  chiesti: Set<number>
  /** Un controllo dopo il disegno è già in coda. */
  inCoda: boolean
  /** Si sta disegnando: gli avvisi della libreria in quel mentre non contano. */
  disegnando: boolean
  /** Il componente dell'elenco è nella pagina. */
  montata: boolean
  /** Il contenitore dell'elenco, se chi disegna lo ha dato (`radice`). */
  contenitore: HTMLElement | null
}

/**
 * Le finestre per chiave, di modulo: tornando su una pagina le misure prese
 * restano, come prima.
 */
const finestre = new Map<string, Stato>()

/** Il nome dell'isola dell'elenco: una sola per chiave. */
function nomeIsola (chiave: string): string {
  // testo-fisso: chiave dell'isola, non si legge
  return `virtuale:${chiave}`
}

/**
 * Rifà adesso l'isola dell'elenco, per chi ne cambia il contenuto senza
 * passare dallo stato (la ricerca delle persone, a ogni lettera).
 */
export function rifaiElenco (chiave: string): void {
  rifaiIsolaAdesso(nomeIsola(chiave))
}

/** Da dove si sale a cercare la scatola: il genitore del contenitore, o del primo vuoto. */
function partenza (stato: Stato): HTMLElement | null {
  if (stato.contenitore?.isConnected) return stato.contenitore.parentElement
  const inizio = document.querySelector<HTMLElement>(
    `[data-virtuale-inizio="${CSS.escape(stato.opzioni.chiave)}"]`,
  )
  return inizio?.parentElement ?? null
}

/**
 * La scatola che scorre davvero, cercata salendo: la stessa matrice scorre
 * dentro di sé in una pagina e nel riquadro intorno in un'altra (l'archivio,
 * con o senza foglio aperto).
 */
function scatola (stato: Stato): HTMLElement | null {
  const proprieta = stato.opzioni.orizzontale ? 'overflowX' : 'overflowY'
  for (let su = partenza(stato); su; su = su.parentElement) {
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

/** Se lo scorrimento o una misura hanno cambiato gli indici, si rifà l'elenco. */
function controlla (stato: Stato): void {
  // L'elenco non è più nella pagina: si stacca dalla scatola, che può restare
  // (`main.contenuto` è di tutte le pagine) e misurarsi vuota. Le misure prese
  // restano, per quando si torna.
  if (!stato.montata) {
    stato.calcolo._didMount()()
    return
  }
  if (indici(stato).join(',') !== stato.disegnati) ridisegnaIsola(nomeIsola(stato.opzioni.chiave))
}

/**
 * Dopo il disegno, a documento aggiornato e scorrimenti rimessi: aggancia la
 * scatola (nuova se si è cambiata pagina), prende dove comincia l'elenco dentro
 * di lei e misura le voci disegnate. Se qualcosa sposta gli indici, `controlla`
 * rifà l'elenco.
 */
function dopoIlDisegno (stato: Stato): void {
  stato.inCoda = false
  const { calcolo, opzioni } = stato
  if (finestre.get(opzioni.chiave) !== stato || !stato.montata) return
  calcolo._willUpdate()
  const dove = calcolo.scrollElement
  if (!dove) return
  // Lo scorrimento rimesso dopo il disegno non manda un evento in tempo: lo si legge.
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

/** La finestra della chiave, creata alla prima volta. */
function finestraDi (opzioni: OpzioniFinestra): Stato {
  const gia = finestre.get(opzioni.chiave)
  if (gia) return gia
  const nuovo: Stato = {
    opzioni,
    calcolo: undefined as unknown as Virtualizer<HTMLElement, HTMLElement>,
    disegnati: '',
    chiesti: new Set(),
    inCoda: false,
    disegnando: false,
    montata: false,
    contenitore: null,
  }
  nuovo.calcolo = new Virtualizer(opzioniDellaLibreria(nuovo, 0))
  // Una voce sopra la vista misurata diversa dalla stima non sposta lo
  // scorrimento: la libreria lo farebbe per tenere ferma la vista, ma in fondo
  // all'elenco, dove non può scendere, la correzione rimandata diventava una
  // deriva verso l'alto a ogni fotogramma. Con stime giuste il salto è di
  // qualche pixel, e solo tornando dove non si era mai stati.
  nuovo.calcolo.shouldAdjustScrollPositionOnItemSizeChange = () => false
  finestre.set(opzioni.chiave, nuovo)
  return nuovo
}

/**
 * Quel che l'elenco deve disegnare adesso. Il componente che la chiama si
 * ridisegna da solo quando lo scorrimento o una misura cambiano gli indici, e
 * quando qualcuno rifà la sua isola (`rifaiElenco(chiave)`).
 */
export function useFinestra (opzioni: OpzioniFinestra): Finestra {
  const chiave = opzioni.chiave
  const [, rifai] = useReducer((volte: number) => volte + 1, 0)
  const contenitore = useRef<HTMLElement | null>(null)

  // Lo scorrimento rifà questo componente solo, come prima l'isola.
  useLayoutEffect(() => iscriviIsola(nomeIsola(chiave), () => flushSync(rifai)), [chiave])

  const attiva = opzioni.conto > (opzioni.soglia ?? SOGLIA)
  const stato = attiva ? finestraDi(opzioni) : null
  if (!attiva) smonta(chiave)

  // Dopo ogni disegno: in coda, perché gli scorrimenti che il telaio rimette
  // (`Fotografo`) arrivano a disegno finito.
  useLayoutEffect(() => {
    if (!stato) return
    stato.montata = true
    stato.contenitore = contenitore.current
    if (stato.inCoda) return
    stato.inCoda = true
    queueMicrotask(() => dopoIlDisegno(stato))
  })
  useLayoutEffect(() => {
    if (!stato) return
    return () => {
      stato.montata = false
      stato.contenitore = null
      stato.calcolo._didMount()()
    }
  }, [stato])

  const radice = useCallback((nodo: HTMLElement | null) => {
    contenitore.current = nodo
  }, [])

  const fuoco = stato ? colFuoco(stato) : null
  // La chiave di fuoco (`data-chiave`) solo sulla voce col fuoco: è quella che il fuoco ritrova dopo un ridisegno.
  const voce = (indice: number): DatiVoce => ({
    'data-virtuale': chiave,
    'data-virtuale-indice': String(indice),
    ...(indice === fuoco ? { 'data-chiave': `${chiave}:${opzioni.chiaveDi(indice)}` } : {}),
  })
  const base = {
    conto: opzioni.conto,
    chiave: (indice: number) => opzioni.chiaveDi(indice),
    voce,
    misurata: (indice: number): DatiVoce => ({ ...voce(indice), 'data-virtuale-misura': '' }),
    testata: (indice: number): DatiVoce => ({
      'data-virtuale': chiave,
      'data-virtuale-indice': String(indice),
      'data-virtuale-misura': '',
    }),
    inizio: { 'data-virtuale-inizio': chiave },
    radice,
  }

  if (!stato) {
    return {
      ...base,
      attiva: false,
      pezzi: Array.from({ length: opzioni.conto }, (_, indice) => ({ indice })),
      portaInVista: (indice) => indice >= 0 && indice < opzioni.conto,
    }
  }

  stato.opzioni = opzioni
  // Tornando su una pagina la scatola è nuova e parte dall'inizio: lo
  // scorrimento di quella di prima disegnerebbe le colonne sbagliate. Se va
  // rimesso, lo rimette il telaio e lo legge `dopoIlDisegno`.
  if (stato.calcolo.scrollOffset !== null && !stato.calcolo.scrollElement?.isConnected) {
    stato.calcolo.scrollOffset = 0
  }
  stato.disegnando = true
  let scelti: number[]
  try {
    stato.calcolo.setOptions(opzioniDellaLibreria(stato, stato.calcolo.options.scrollMargin))
    scelti = indici(stato)
  } finally {
    stato.disegnando = false
  }
  stato.chiesti.clear()
  stato.disegnati = scelti.join(',')

  return {
    ...base,
    attiva: true,
    pezzi: pezziDi(stato, scelti),
    portaInVista: (indice) => {
      if (indice < 0 || indice >= stato.opzioni.conto) return false
      if (stato.disegnati.split(',').includes(String(indice))) return true
      stato.chiesti.add(indice)
      rifaiIsolaAdesso(nomeIsola(chiave))
      return true
    },
  }
}

/** Lo stile di un vuoto lungo l'asse: niente bordo né margine, solo la misura. */
function stileVuoto (vuoto: number, orizzontale: boolean): CSSProperties {
  return orizzontale
    ? { width: vuoto, minWidth: vuoto, maxWidth: vuoto, padding: 0, border: 0 }
    : { height: vuoto, padding: 0, margin: 0, border: 0 }
}

/**
 * Il vuoto al posto delle voci saltate, muto per il lettore di schermo. Il
 * primo pezzo porta `inizio` (`{...f.inizio}`).
 */
export function Vuoto ({ come, misura, orizzontale = false, classe, ...inizio }: {
  come: 'th' | 'td' | 'div' | 'li'
  misura: number
  orizzontale?: boolean
  classe: string
  'data-virtuale-inizio'?: string
}): ReactElement {
  const Tag = come
  return <Tag className={classe} style={stileVuoto(misura, orizzontale)} aria-hidden="true" {...inizio} />
}

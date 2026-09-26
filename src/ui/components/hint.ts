// Il suggerimento dietro la «i»: la spiegazione di un campo o di una scheda
// resta chiusa accanto al nome, per chi la cerca. Solo le spiegazioni: conti,
// errori e avvertenze restano in vista.
//
// Il fumetto è appeso a `document.body` (dentro una modale il corpo scorre e
// lo taglierebbe) e vive fuori dal ridisegno: finché è aperto, a ogni
// fotogramma controlla che il segno sia ancora nella pagina e lo segue.

import { h, type Figlio } from '../dom.js'
import { icona } from './icons.js'
import { testi } from './hint.testi.js'

/** Quanto stare lontani dal bordo della finestra, e dal segno. */
const MARGINE = 8
const DISTANZA = 6

/**
 * Una coordinata spinta dentro la finestra, fra il margine e il bordo lontano
 * meno la misura: lo stesso conto per il fumetto e per il menu.
 */
export function dentroIBordi (posizione: number, misura: number, spazio: number): number {
  return Math.max(MARGINE, Math.min(posizione, spazio - misura - MARGINE))
}

/**
 * Quanto aspettare prima di aprire al passaggio del puntatore: senza attesa
 * attraversare un modulo accende un fumetto dopo l'altro. Come i suggerimenti
 * di sistema.
 */
const ATTESA_APERTURA = 350
/** Il tempo per passare dal segno al fumetto senza che si chiuda in mezzo. */
const ATTESA_CHIUSURA = 150

let contatore = 0
let apertoOra: (() => void) | null = null

interface OpzioniSuggerimento {
  /**
   * Di che cosa parla, per chi non vede il segno: «Spiegazione: Peso». Dieci
   * «Spiegazione» uguali non direbbero di quale campo.
   */
  etichetta?: string
  classe?: string
}

/**
 * Il segno «i» con la sua spiegazione chiusa dentro. Si apre col puntatore
 * fermo, col tabulatore o premendolo; premuto resta aperto fino a un clic
 * altrove o Esc. Il testo sta anche nella pagina, nascosto, per
 * `aria-describedby`. Dentro la `<label>` di un campo va usato con
 * `legaAlSegno`. Pulsante fatto a mano: il `title` di `pulsante()` farebbe
 * comparire la frase due volte.
 */
export function suggerimento (testo: Figlio, opzioni: OpzioniSuggerimento = {}): HTMLElement {
  // Non `campo-…`: `apriModale` riscrive quegli id ma non i riferimenti di
  // `aria-describedby`.
  const id = `suggerimento-${++contatore}` // testo-fisso: id dell’elemento, non si legge
  const nascosto = h('span', { id, class: 'suggerimento__testo', hidden: true }, testo)

  const segno = h(
    'button',
    {
      type: 'button',
      class: 'suggerimento__segno',
      attr: {
        'aria-label': opzioni.etichetta
          ? testi().spiegazioneDi(opzioni.etichetta)
          : testi().spiegazione,
        'aria-describedby': id,
        'aria-expanded': 'false',
      },
    },
    icona('informazione', 'icona--minuta'),
  )

  let fumetto: HTMLElement | null = null
  /** Aperto con un clic: non si chiude quando il puntatore se ne va. */
  let fermo = false
  let attesa: ReturnType<typeof setTimeout> | undefined
  let fotogramma = 0
  /** Il filo degli ascoltatori sul documento, uno per ogni apertura. */
  let ascolto: AbortController | null = null

  const chiudi = () => {
    clearTimeout(attesa)
    if (!fumetto) return
    cancelAnimationFrame(fotogramma)
    fumetto.remove()
    fumetto = null
    fermo = false
    if (apertoOra === chiudi) apertoOra = null
    segno.setAttribute('aria-expanded', 'false')
    segno.classList.remove('suggerimento__segno--aperto')
    ascolto?.abort()
    ascolto = null
  }

  const segui = () => {
    if (!fumetto) return
    if (!segno.isConnected) {
      chiudi()
      return
    }
    colloca(fumetto, segno)
    fotogramma = requestAnimationFrame(segui)
  }

  const apri = () => {
    clearTimeout(attesa)
    // Il segno può essere uscito dalla pagina durante l'attesa: niente fumetto
    // appeso a niente.
    if (!segno.isConnected) return
    if (fumetto) return
    if (apertoOra !== chiudi) apertoOra?.()
    // Una copia del testo: l'originale nascosto continua a descrivere il segno.
    fumetto = h(
      'div',
      {
        class: 'suggerimento__fumetto',
        attr: { role: 'tooltip' },
        onpointerenter: () => clearTimeout(attesa),
        onpointerleave: () => { if (!fermo) chiudiFraPoco() },
      },
      ...[...nascosto.childNodes].map((nodo) => nodo.cloneNode(true)),
    )
    document.body.appendChild(fumetto)
    colloca(fumetto, segno)
    apertoOra = chiudi
    segno.setAttribute('aria-expanded', 'true')
    segno.classList.add('suggerimento__segno--aperto')
    ascolto = new AbortController()
    const { signal } = ascolto
    document.addEventListener('pointerdown', allaPressione, { capture: true, signal })
    document.addEventListener('keydown', allaTastiera, { capture: true, signal })
    window.addEventListener('blur', chiudi, { signal })
    fotogramma = requestAnimationFrame(segui)
  }

  const chiudiFraPoco = () => {
    clearTimeout(attesa)
    attesa = setTimeout(chiudi, ATTESA_CHIUSURA)
  }

  const allaPressione = (e: PointerEvent) => {
    const bersaglio = e.target as Node | null
    if (segno.contains(bersaglio) || fumetto?.contains(bersaglio)) return
    chiudi()
  }

  // In cattura e fermato, solo a fumetto aperto: dentro una modale Esc chiuderebbe
  // anche lei. `Immediate` perché palette e menu ascoltano sullo stesso `document`.
  const allaTastiera = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopImmediatePropagation()
    e.preventDefault()
    chiudi()
  }

  segno.addEventListener('click', (e) => {
    // Dentro la `<label>` di una casella il clic spunterebbe anche lei.
    e.preventDefault()
    e.stopPropagation()
    if (fumetto && fermo) {
      chiudi()
      return
    }
    apri()
    fermo = true
  })
  segno.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || fumetto) {
      clearTimeout(attesa)
      return
    }
    clearTimeout(attesa)
    attesa = setTimeout(apri, ATTESA_APERTURA)
  })
  segno.addEventListener('pointerleave', () => {
    if (fumetto && !fermo) chiudiFraPoco()
    else if (!fumetto) clearTimeout(attesa)
  })
  // Col tabulatore si apre subito; col clic apre il clic.
  segno.addEventListener('focus', () => {
    if (segno.matches(':focus-visible')) apri()
  })
  segno.addEventListener('blur', () => {
    if (!fermo) chiudi()
  })

  return h('span', { class: ['suggerimento', opzioni.classe] }, segno, nascosto)
}

/**
 * Lega un controllo al segno nella sua etichetta: lo descrive con la
 * spiegazione nascosta (`aria-describedby`) e gli rimette il nome con
 * `aria-label`, perché il pulsante dentro la `<label>` farebbe «Peso
 * Spiegazione: Peso». Se il controllo è un contenitore (la data scritta), il
 * legame va al campo che si batte.
 */
export function legaAlSegno (
  controllo: unknown,
  segno: HTMLElement | null,
  etichetta: string,
): void {
  const id = segno?.querySelector('.suggerimento__testo')?.id
  if (!id || !(controllo instanceof HTMLElement)) return
  const bersaglio = controllo.matches('input, select, textarea')
    ? controllo
    : controllo.querySelector('input:not([type="hidden"]), select, textarea')
  bersaglio?.setAttribute('aria-describedby', id)
  bersaglio?.setAttribute('aria-label', etichetta)
}

/**
 * Mette il fumetto sotto il segno, o sopra se sotto non ci sta, allineato
 * finché il bordo lo permette.
 */
function colloca (fumetto: HTMLElement, segno: HTMLElement): void {
  const dove = segno.getBoundingClientRect()
  const larghezza = fumetto.offsetWidth
  const altezza = fumetto.offsetHeight
  const sotto = dove.bottom + DISTANZA
  const sopra = dove.top - DISTANZA - altezza
  const y = sotto + altezza <= window.innerHeight - MARGINE || sopra < MARGINE ? sotto : sopra
  fumetto.style.left = `${dentroIBordi(dove.left - MARGINE, larghezza, window.innerWidth)}px` // testo-fisso: misura CSS
  fumetto.style.top = `${Math.max(MARGINE, y)}px` // testo-fisso: misura CSS
  fumetto.classList.toggle('suggerimento__fumetto--sopra', y !== sotto)
}

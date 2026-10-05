// Il suggerimento dietro la «i», in React. La spiegazione resta chiusa accanto
// al nome (solo le spiegazioni: conti, errori e avvertenze restano in vista);
// si apre col puntatore fermo, col tabulatore o premendo; premuto resta aperto
// fino a un clic altrove o Esc. Il fumetto sta su `document.body` (dentro una modale
// il corpo scorre e lo taglierebbe), e finché è aperto segue il segno a ogni
// fotogramma.

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { classi } from '#ui/classNames.js'
import { testi } from '#ui/components/hint.testi.js'
import { Icona } from './icons.js'

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
/** Senza attesa attraversare un modulo accende un fumetto dopo l'altro. */
const ATTESA_APERTURA = 350
/** Il tempo per passare dal segno al fumetto senza che si chiuda in mezzo. */
const ATTESA_CHIUSURA = 150

/** Chi ha il fumetto aperto adesso: se ne apre uno solo alla volta. */
let apertoOra: (() => void) | null = null

/** Mette il fumetto sotto il segno, o sopra se sotto non ci sta. */
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

/** L'id del testo nascosto di un suggerimento, per legarlo al suo campo (`aria-describedby`). */
export function useIdSuggerimento (): string {
  // Non `campo-…`: quegli id li rende unici la modale, i riferimenti no.
  return `suggerimento-${useId().replace(/:/g, '')}` // testo-fisso: id dell’elemento, non si legge
}

export function Suggerimento ({ testo, etichetta, classe, id }: {
  testo: ReactNode
  /**
   * Di che cosa parla, per chi non vede il segno: «Spiegazione: Peso». Dieci
   * «Spiegazione» uguali non direbbero di quale campo.
   */
  etichetta?: string
  classe?: string
  /** L'id del testo nascosto, quando un campo lo vuole citare. */
  id?: string
}): ReactElement {
  const proprio = useIdSuggerimento()
  const idTesto = id ?? proprio
  const segno = useRef<HTMLButtonElement | null>(null)
  const fumetto = useRef<HTMLDivElement | null>(null)
  const [aperto, impostaAperto] = useState(false)
  /** Aperto con un clic: non si chiude quando il puntatore se ne va. */
  const fermo = useRef(false)
  const attesa = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const chiudi = useCallback(() => {
    clearTimeout(attesa.current)
    fermo.current = false
    impostaAperto(false)
  }, [])

  const apri = useCallback(() => {
    clearTimeout(attesa.current)
    // Il segno può essere uscito dalla pagina durante l'attesa.
    if (!segno.current?.isConnected) return
    impostaAperto(true)
  }, [])

  const chiudiFraPoco = useCallback(() => {
    clearTimeout(attesa.current)
    attesa.current = setTimeout(chiudi, ATTESA_CHIUSURA)
  }, [chiudi])

  // Aperto: un fumetto solo alla volta, gli ascoltatori sul documento e il
  // segno seguito a ogni fotogramma.
  useEffect(() => {
    if (!aperto) return
    if (apertoOra !== chiudi) apertoOra?.()
    apertoOra = chiudi
    let fotogramma = 0
    const segui = () => {
      if (!segno.current?.isConnected) {
        chiudi()
        return
      }
      if (fumetto.current) colloca(fumetto.current, segno.current)
      fotogramma = requestAnimationFrame(segui)
    }
    segui()
    const allaPressione = (e: PointerEvent) => {
      const bersaglio = e.target as Node | null
      if (segno.current?.contains(bersaglio) || fumetto.current?.contains(bersaglio)) return
      chiudi()
    }
    // In cattura e fermato: dentro una modale Esc chiuderebbe anche lei.
    const allaTastiera = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      e.preventDefault()
      chiudi()
    }
    document.addEventListener('pointerdown', allaPressione, true)
    document.addEventListener('keydown', allaTastiera, true)
    window.addEventListener('blur', chiudi)
    return () => {
      cancelAnimationFrame(fotogramma)
      document.removeEventListener('pointerdown', allaPressione, true)
      document.removeEventListener('keydown', allaTastiera, true)
      window.removeEventListener('blur', chiudi)
      if (apertoOra === chiudi) apertoOra = null
    }
  }, [aperto, chiudi])

  useEffect(() => () => clearTimeout(attesa.current), [])

  return (
    <span className={classi('suggerimento', classe)}>
      <button
        ref={segno}
        type="button"
        className={classi('suggerimento__segno', aperto && 'suggerimento__segno--aperto')}
        aria-label={etichetta ? testi().spiegazioneDi(etichetta) : testi().spiegazione}
        aria-describedby={idTesto}
        aria-expanded={aperto ? 'true' : 'false'}
        onClick={(e) => {
          // Dentro la `<label>` di una casella il clic spunterebbe anche lei.
          e.preventDefault()
          e.stopPropagation()
          if (aperto && fermo.current) {
            chiudi()
            return
          }
          apri()
          fermo.current = true
        }}
        onPointerEnter={(e) => {
          clearTimeout(attesa.current)
          if (e.pointerType !== 'mouse' || aperto) return
          attesa.current = setTimeout(apri, ATTESA_APERTURA)
        }}
        onPointerLeave={() => {
          if (aperto && !fermo.current) chiudiFraPoco()
          else if (!aperto) clearTimeout(attesa.current)
        }}
        // Col tabulatore si apre subito; col clic apre il clic.
        onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) apri() }}
        onBlur={() => { if (!fermo.current) chiudi() }}
      >
        <Icona nome="informazione" classe="icona--minuta" />
      </button>
      <span id={idTesto} className="suggerimento__testo" hidden>{testo}</span>
      {aperto
        ? createPortal(
            <div
              ref={fumetto}
              className="suggerimento__fumetto"
              role="tooltip"
              onPointerEnter={() => clearTimeout(attesa.current)}
              onPointerLeave={() => { if (!fermo.current) chiudiFraPoco() }}
            >
              {testo}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}

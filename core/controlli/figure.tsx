// Le scelte che si capiscono guardandole: per il tema il registro in piccolo,
// per la lingua la bandiera (`core/i18n/flags.ts`). Un disegno solo per il
// pannello e per la finestra nativa, che prima ne teneva una copia a mano. Il
// manifesto non ne sa niente: una voce con una figura qui si mostra a schede
// (il foglio è `ui/styles/figure-choice.css`, caricato da tutte e due).

import { useEffect, useState, type ReactElement, type ReactNode } from 'react'

import { LINGUE, NOMI_DELLE_LINGUE, lingua } from '#core/i18n/index.js'
import { figuraLingua } from '#core/i18n/flags.js'
import { testi } from './controls.testi.js'

/**
 * Che cosa mostra una scelta oltre alle sue parole: la figura, e una nota di
 * adesso. La figura è JSX, o i nodi già fatti da `flags.ts` (`nodi`), che il
 * riquadro della figura porta dentro così come sono.
 */
interface Raffigurazione {
  figura: ReactNode | { nodi: () => Node[] }
  /** Quel che la scelta sta facendo adesso, sotto l'aiuto; `null` se non c'è niente da dire. */
  nota: ReactNode
}

type Raffigura = (valore: string, attiva: boolean) => Raffigurazione

// ---------------------------------------------------------------- il tema

/**
 * Il registro in piccolo, a blocchi di colore senza testo. I colori sono i
 * token veri: `data-tema-figura` li ridefinisce per il tema della miniatura (in
 * fondo a `theme.css`), qualunque sia quello della pagina.
 */
function Miniatura ({ tema }: { tema: 'chiaro' | 'scuro' }): ReactElement {
  return (
    <span className="figura-tema" data-tema-figura={tema}>
      <span className="figura-tema__barra">
        <span className="figura-tema__marchio" />
        <span className="figura-tema__titolo" />
      </span>
      <span className="figura-tema__corpo">
        <span className="figura-tema__lato">
          <span className="figura-tema__voce figura-tema__voce--scelta" />
          <span className="figura-tema__voce" />
          <span className="figura-tema__voce" />
          <span className="figura-tema__voce" />
        </span>
        <span className="figura-tema__pagina">
          <span className="figura-tema__titoletto" />
          <span className="figura-tema__scheda">
            <span className="figura-tema__riga" />
            <span className="figura-tema__riga" />
            <span className="figura-tema__riga" />
          </span>
          <span className="figura-tema__pulsante" />
        </span>
      </span>
    </span>
  )
}

// testo-fisso: una media query, la legge il browser
const SCURO = '(prefers-color-scheme: dark)'

/** Se Windows è scuro adesso. */
function scuroAdesso (): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.(SCURO).matches ?? false)
}

/**
 * Che cosa sta seguendo «Sistema» adesso, al passo quando Windows cambia tema
 * da solo. Si può dire solo con «Sistema» scelto: con «Chiaro» o «Scuro»
 * `prefers-color-scheme` riflette la scelta, non Windows.
 */
function ComeWindows (): ReactElement {
  const [scuro, impostaScuro] = useState(scuroAdesso)
  useEffect(() => {
    const domanda = window.matchMedia?.(SCURO)
    if (!domanda) return
    const segui = (): void => impostaScuro(domanda.matches)
    domanda.addEventListener('change', segui)
    return () => domanda.removeEventListener('change', segui)
  }, [])
  return <span>{testi().comeWindows(scuro)}</span>
}

function figuraTema (valore: string, attiva: boolean): Raffigurazione {
  if (valore === 'chiaro' || valore === 'scuro') return { figura: <Miniatura tema={valore} />, nota: null }
  const divisa = (
    <span className="figura-tema-divisa">
      <Miniatura tema="chiaro" />
      <Miniatura tema="scuro" />
    </span>
  )
  return { figura: divisa, nota: attiva ? <ComeWindows /> : null }
}

// ---------------------------------------------------------------- la lingua

/** Una lingua, o «Sistema»; sotto «Sistema» scelto, la lingua che segue (quella della pagina). */
function figuraDellaLingua (valore: string, attiva: boolean): Raffigurazione {
  const figura = { nodi: () => [figuraLingua(valore, LINGUE, document)] }
  if (valore !== 'sistema' || !attiva) return { figura, nota: null }
  return { figura, nota: <span>{testi().linguaAdesso(NOMI_DELLE_LINGUE[lingua()])}</span> }
}

// ---------------------------------------------------------------- l'elenco

const RAFFIGURAZIONI: Readonly<Record<string, Raffigura>> = {
  'registroDocenti.aspetto.lingua': figuraDellaLingua,
  'registroDocenti.aspetto.tema': figuraTema,
}

/** Come si raffigurano le scelte di una chiave, o `null` se si scelgono a parole. */
export function raffigurazioneDi (chiave: string): Raffigura | null {
  return RAFFIGURAZIONI[chiave] ?? null
}

/** Vero se la figura sono nodi già fatti, da innestare. */
export function diNodi (figura: Raffigurazione['figura']): figura is { nodi: () => Node[] } {
  return typeof figura === 'object' && figura !== null && 'nodi' in figura && typeof figura.nodi === 'function'
}

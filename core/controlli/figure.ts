// Le scelte che si capiscono guardandole: per il tema il registro in piccolo,
// per la lingua la bandiera (`core/i18n/flags.ts`). Un disegno solo per il
// pannello e per la finestra nativa, che prima ne teneva una copia a mano. Il
// manifesto non ne sa niente: una voce con una figura qui si mostra a schede
// (il foglio è `ui/pannello/styles/figure-choice.css`, caricato da tutte e due).

import { LINGUE, NOMI_DELLE_LINGUE, lingua } from '../i18n/index.js'
import { figuraLingua } from '../i18n/flags.js'
import { elemento } from './dom.js'
import { testi } from './controls.testi.js'

/** Che cosa mostra una scelta oltre alle sue parole: la figura, e una nota di adesso. */
interface Raffigurazione {
  figura: HTMLElement
  /** Quel che la scelta sta facendo adesso, sotto l'aiuto; `null` se non c'è niente da dire. */
  nota: HTMLElement | null
}

type Raffigura = (valore: string, attiva: boolean, documento: Document) => Raffigurazione

// ---------------------------------------------------------------- il tema

/**
 * Il registro in piccolo, a blocchi di colore senza testo. I colori sono i
 * token veri: `data-tema-figura` li ridefinisce per il tema della miniatura (in
 * fondo a `theme.css`), qualunque sia quello della pagina.
 */
function miniatura (tema: 'chiaro' | 'scuro', documento: Document): HTMLElement {
  const pezzo = (nome: string, ...dentro: HTMLElement[]): HTMLElement =>
    elemento(documento, 'span', `figura-tema__${nome}`, ...dentro)
  const tutta = elemento(
    documento,
    'span',
    'figura-tema',
    pezzo('barra', pezzo('marchio'), pezzo('titolo')),
    pezzo(
      'corpo',
      pezzo(
        'lato',
        elemento(documento, 'span', 'figura-tema__voce figura-tema__voce--scelta'),
        pezzo('voce'),
        pezzo('voce'),
        pezzo('voce'),
      ),
      pezzo(
        'pagina',
        pezzo('titoletto'),
        pezzo('scheda', pezzo('riga'), pezzo('riga'), pezzo('riga')),
        pezzo('pulsante'),
      ),
    ),
  )
  tutta.setAttribute('data-tema-figura', tema)
  return tutta
}

// testo-fisso: una media query, la legge il browser
const SCURO = '(prefers-color-scheme: dark)'

/**
 * Che cosa sta seguendo «Sistema» adesso. Si può dire solo con «Sistema»
 * scelto: con «Chiaro» o «Scuro» `prefers-color-scheme` riflette la scelta,
 * non Windows.
 */
function comeWindows (documento: Document): string {
  return testi().comeWindows(documento.defaultView?.matchMedia?.(SCURO).matches ?? false)
}

/**
 * Tiene la nota al passo quando Windows cambia tema da solo: un ascoltatore
 * per pagina, che aggiorna le note che trova. Uno per nota si accumulerebbe a
 * ogni ridisegno.
 */
const inAscolto = new WeakSet<Document>()
function ascoltaWindows (documento: Document): void {
  const finestra = documento.defaultView
  if (inAscolto.has(documento) || !finestra?.matchMedia) return
  inAscolto.add(documento)
  finestra.matchMedia(SCURO).addEventListener('change', () => {
    for (const nota of documento.querySelectorAll<HTMLElement>('[data-segue-sistema]')) {
      nota.textContent = comeWindows(documento)
    }
  })
}

function figuraTema (valore: string, attiva: boolean, documento: Document): Raffigurazione {
  if (valore === 'chiaro' || valore === 'scuro') return { figura: miniatura(valore, documento), nota: null }
  const divisa = elemento(
    documento, 'span', 'figura-tema-divisa', miniatura('chiaro', documento), miniatura('scuro', documento),
  )
  if (!attiva) return { figura: divisa, nota: null }
  ascoltaWindows(documento)
  const nota = elemento(documento, 'span', null, comeWindows(documento))
  nota.setAttribute('data-segue-sistema', '')
  return { figura: divisa, nota }
}

// ---------------------------------------------------------------- la lingua

/** Una lingua, o «Sistema»; sotto «Sistema» scelto, la lingua che segue (quella della pagina). */
function figuraDellaLingua (valore: string, attiva: boolean, documento: Document): Raffigurazione {
  const figura = figuraLingua(valore, LINGUE, documento)
  if (valore !== 'sistema' || !attiva) return { figura, nota: null }
  return {
    figura,
    nota: elemento(documento, 'span', null, testi().linguaAdesso(NOMI_DELLE_LINGUE[lingua()])),
  }
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

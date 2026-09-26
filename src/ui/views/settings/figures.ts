// Le impostazioni che si scelgono guardandole: una voce del manifesto con
// `scelte` registrata qui si mostra a schede con figura
// (`components/figureChoice.ts`), le altre a tendina. Il manifesto non ne sa
// niente; la finestra nativa ha la sua copia dell'elenco in
// `shell/pages/settings/settings.ts`. Oggi: il tema (miniature) e la lingua
// (bandiere, `i18n/flags.ts`, riconoscibili senza leggere).

import { LINGUE, NOMI_DELLE_LINGUE, lingua } from '../../../i18n/index.js'
import { figuraLingua } from '../../../i18n/flags.js'
import type { VoceProgramma } from '../../../protocol.js'
import { sceltaFigurata } from '../../components/figureChoice.js'
import { h, type Figlio } from '../../dom.js'
import { testi } from './figures.testi.js'

/** Che cosa mostra una scelta, oltre alle parole del manifesto. */
interface Raffigurazione {
  figura: Figlio
  nota?: Figlio
}

// ---------------------------------------------------------------- il tema

/**
 * Il registro in piccolo, a blocchi di colore senza testo. I colori sono i
 * token veri: `data-tema-figura` li ridefinisce per il tema della miniatura (in
 * fondo a `theme.css`), qualunque sia quello dell'applicazione.
 */
function miniatura (tema: 'chiaro' | 'scuro'): HTMLElement {
  const pezzo = (nome: string): HTMLElement => h('span', { class: `figura-tema__${nome}` })
  return h(
    'span',
    { class: 'figura-tema', attr: { 'data-tema-figura': tema } },
    h('span', { class: 'figura-tema__barra' }, pezzo('marchio'), pezzo('titolo')),
    h(
      'span',
      { class: 'figura-tema__corpo' },
      h(
        'span',
        { class: 'figura-tema__lato' },
        h('span', { class: 'figura-tema__voce figura-tema__voce--scelta' }),
        pezzo('voce'),
        pezzo('voce'),
        pezzo('voce'),
      ),
      h(
        'span',
        { class: 'figura-tema__pagina' },
        pezzo('titoletto'),
        h('span', { class: 'figura-tema__scheda' }, pezzo('riga'), pezzo('riga'), pezzo('riga')),
        pezzo('pulsante'),
      ),
    ),
  )
}

/** Il sistema: le due miniature una sopra l'altra, tagliate in diagonale. */
function miniaturaDivisa (): HTMLElement {
  return h('span', { class: 'figura-tema-divisa' }, miniatura('chiaro'), miniatura('scuro'))
}

// testo-fisso: una media query, la legge il browser
const SCURO = '(prefers-color-scheme: dark)'

/**
 * Che cosa sta seguendo «Sistema» adesso. Si può dire solo con «Sistema»
 * scelto: con «Chiaro» o «Scuro» `prefers-color-scheme` riflette la scelta,
 * non Windows.
 */
function comeWindows (): string {
  return testi().comeWindows(window.matchMedia(SCURO).matches)
}

/**
 * Tiene la nota al passo quando Windows cambia tema da solo. Un ascoltatore
 * solo per la pagina, che aggiorna le note che trova: uno per nota si
 * accumulerebbe a ogni ridisegno.
 */
let inAscolto = false
function ascoltaWindows (): void {
  if (inAscolto) return
  inAscolto = true
  window.matchMedia(SCURO).addEventListener('change', () => {
    for (const nota of document.querySelectorAll<HTMLElement>('[data-segue-sistema]')) {
      nota.textContent = comeWindows()
    }
  })
}

function figuraTema (valore: string, attivo: boolean): Raffigurazione {
  if (valore === 'chiaro' || valore === 'scuro') return { figura: miniatura(valore) }
  if (!attivo) return { figura: miniaturaDivisa() }
  ascoltaWindows()
  return {
    figura: miniaturaDivisa(),
    nota: h('span', { dataset: { segueSistema: '' } }, comeWindows()),
  }
}

// ---------------------------------------------------------------- la lingua

/**
 * Una lingua, o «Sistema»; sotto «Sistema», se è la scelta attiva, la lingua
 * che sta seguendo (quella della pagina).
 */
function figuraDellaLingua (valore: string, attivo: boolean): Raffigurazione {
  const figura = figuraLingua(valore, LINGUE)
  if (valore !== 'sistema' || !attivo) return { figura }
  return { figura, nota: testi().linguaAdesso(NOMI_DELLE_LINGUE[lingua()]) }
}

// ---------------------------------------------------------------- l'elenco

const RAFFIGURAZIONI: Readonly<
  Record<string, (valore: string, attivo: boolean) => Raffigurazione>
> = {
  'registroDocenti.aspetto.lingua': figuraDellaLingua,
  'registroDocenti.aspetto.tema': figuraTema,
}

/**
 * Il nome e la frase di una scelta, dal suo aiuto: il manifesto scrive «Nome:
 * frase», e sotto la figura il nome sta già in grassetto.
 */
export function nomeEAiuto (valore: string, aiuto: string): { nome: string, aiuto: string } {
  // Lo spazio prima dei due punti (il francese lo mette) non fa parte del nome.
  const due = /^([^:]{1,24}?)\s*:\s+(.+)$/s.exec(aiuto)
  // Un aiuto di una parola sola è già il nome: sotto niente.
  if (!due && /^\S{1,24}$/.test(aiuto)) return { nome: aiuto, aiuto: '' }
  if (!due) return { nome: valore.charAt(0).toUpperCase() + valore.slice(1), aiuto }
  const resto = due[2]
  return { nome: due[1], aiuto: resto.charAt(0).toUpperCase() + resto.slice(1) }
}

/**
 * Le schede con la figura, se la voce ne ha una; `null` altrimenti, e chi
 * chiama disegna la tendina di sempre.
 */
export function sceltaConFigure (
  voce: VoceProgramma,
  spenta: boolean,
  al: (valore: string | number) => void,
): HTMLElement | null {
  const raffigura = RAFFIGURAZIONI[voce.chiave]
  if (!raffigura || !voce.scelte) return null
  const scelte = voce.scelte
  const valore = String(voce.valore)
  return sceltaFigurata({
    nome: voce.chiave,
    etichetta: voce.etichetta,
    valore,
    disabilitato: spenta,
    scelte: scelte.map((scelta) => ({
      valore: String(scelta.valore),
      ...nomeEAiuto(String(scelta.valore), scelta.aiuto),
      ...raffigura(String(scelta.valore), String(scelta.valore) === valore),
    })),
    // Il valore torna con il suo tipo: la dogana confronta con `===`.
    al: (scelto) => {
      const scelta = scelte.find((candidata) => String(candidata.valore) === scelto)
      if (scelta) al(scelta.valore)
    },
  })
}

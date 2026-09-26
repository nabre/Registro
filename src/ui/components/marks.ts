// I segni della matrice del comportamento, disegnati allo stesso modo nel
// registro e nella scheda della persona.

import type { SegnoOsservato } from '../../domain/models.js'
import { NOMI_SEGNO, nomeSegnoScritto } from '../../domain/observations.js'
import { h } from '../dom.js'
import { icona, type NomeIcona } from './icons.js'

/**
 * I due segni con la loro icona: «++» e «−−» in una casella piccola si
 * confondono, verde e rosso no. Il nome per esteso sta in titolo ed etichetta.
 */
export const SEGNI: Array<{ valore: SegnoOsservato; simbolo: NomeIcona; nome: string }> = [
  { valore: 'positivo', simbolo: 'piu', nome: NOMI_SEGNO.positivo },
  { valore: 'negativo', simbolo: 'meno', nome: NOMI_SEGNO.negativo },
]

/** Come si chiama un segno: le parole del dominio, le stesse del verbale stampato. */
export const nomeSegno = nomeSegnoScritto

/**
 * Le classi di una casella: il segno e il puntino dell'annotazione, uguali nei
 * tre posti in cui la casella si disegna.
 */
function classiSegno (
  segno: SegnoOsservato | null,
  conNota = false,
): Array<string | false | null> {
  return ['cella-segno', segno && `cella-segno--${segno}`, conNota && 'cella-segno--annotata'] // testo-fisso: classe CSS
}

/** La faccia del segno, o niente quando segno non ce n'è. */
function facciaSegno (segno: SegnoOsservato | null): SVGSVGElement | null {
  const quale = SEGNI.find((s) => s.valore === segno)
  return quale ? icona(quale.simbolo) : null
}

/**
 * Il segno da rileggere e non da premere. La casella vuota resta disegnata:
 * dice «annotato senza giudizio» e tiene allineata la riga.
 */
export function segnoFermo (
  segno: SegnoOsservato | null,
  opzioni: { conNota?: boolean; racconto?: string } = {},
): HTMLElement {
  const racconto = opzioni.racconto ?? nomeSegno(segno)
  return h(
    'span',
    {
      class: [...classiSegno(segno, opzioni.conNota), 'cella-segno--ferma'],
      attr: { title: racconto, 'aria-label': racconto },
    },
    facciaSegno(segno),
  )
}

// I segni della matrice del comportamento: come si disegnano, ovunque li si
// disegni.
//
// Stavano dentro la vista del registro, che è dove si segnano, ed erano giusti
// lì finché nessun altro li mostrava. Adesso la scheda della persona li rilegge
// — gli stessi segni, le stesse facce, gli stessi colori — e due elenchi di
// due voci in due file diversi sono due occasioni di far diventare il «meno»
// di una pagina una crocetta nell'altra.

import type { SegnoOsservato } from '../../domain/models.js'
import { NOMI_SEGNO, nomeSegnoScritto } from '../../domain/observations.js'
import { h } from '../dom.js'
import { icona, type NomeIcona } from './icons.js'

/**
 * I due segni, con la faccia che portano nella matrice.
 *
 * Icona e non testo: «++» e «−−» scritti in una casella da trentaquattro pixel
 * si leggono male e si distinguono peggio — a colpo d'occhio un più doppio e un
 * meno doppio sono due trattini — mentre il verde e il rosso si riconoscono
 * senza mettere a fuoco, che è quel che serve a chi guarda la classe e non lo
 * schermo. Il segno resta scritto per esteso nel titolo e nell'etichetta per
 * chi legge con la voce.
 */
export const SEGNI: Array<{ valore: SegnoOsservato; simbolo: NomeIcona; nome: string }> = [
  { valore: 'positivo', simbolo: 'piu', nome: NOMI_SEGNO.positivo },
  { valore: 'negativo', simbolo: 'meno', nome: NOMI_SEGNO.negativo },
]

/**
 * Come si chiama un segno quando lo si deve dire.
 *
 * Le parole vengono dal dominio: sono le stesse che finiscono sul verbale
 * stampato, e tenerne una copia qui vorrebbe dire due vocabolari da
 * riallineare a mano al primo ripensamento.
 */
export const nomeSegno = nomeSegnoScritto

/**
 * Le classi di una casella: il segno, e il puntino di chi porta un'annotazione.
 *
 * Le tiene questo file perché la casella si disegna in tre posti — la matrice
 * del registro, quella della scheda personale, l'elenco delle annotazioni — e
 * una casella verde in una pagina e gialla in un'altra è lo stesso dato
 * raccontato come se fossero due.
 */
function classiSegno (
  segno: SegnoOsservato | null,
  conNota = false,
): Array<string | false | null> {
  return ['cella-segno', segno && `cella-segno--${segno}`, conNota && 'cella-segno--annotata']
}

/** La faccia del segno, o niente quando segno non ce n'è. */
function facciaSegno (segno: SegnoOsservato | null): SVGSVGElement | null {
  const quale = SEGNI.find((s) => s.valore === segno)
  return quale ? icona(quale.simbolo) : null
}

/**
 * Il segno da rileggere e non da premere: fuori dal registro non si gira.
 *
 * La casella vuota resta disegnata lo stesso — un quadretto senza faccia — e
 * non sparisce: è quel che dice «qui è stato annotato qualcosa senza dire se è
 * un bene o un male», e senza il quadretto la riga comincerebbe disallineata
 * rispetto a quelle sopra.
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

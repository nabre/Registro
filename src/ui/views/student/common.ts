// La scheda personale: i riquadri comuni ai temi dei box di materia.

import { titoloGruppo } from '../../components/base.js'
import { h, type Figlio } from '../../dom.js'

/**
 * Un riquadro dentro il box di una materia (presenze, voti, osservazioni). Ci
 * sono sempre, anche vuoti, così ogni tema cade alla stessa altezza in ogni box.
 */
export function riquadroTema (titolo: string, quante: number, contenuto: Figlio): Figlio {
  return h('section', { class: 'riquadro-tema' }, titoloGruppo(titolo, quante, 'h5'), contenuto)
}

/** La riga che riempie un riquadro quando non c'è niente da metterci. */
export function nienteQui (testo: string): Figlio {
  return h('p', { class: 'testo-quieto riquadro-tema__niente' }, testo)
}

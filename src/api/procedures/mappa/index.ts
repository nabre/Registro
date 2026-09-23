// La mappa: leggere dove sta la gente, e cercare in rete dove sta un indirizzo.
//
// `geocodifica` è l'unica, fra le procedure che compongono fogli e accendono
// schermi, che tocchi davvero una raccolta: scrive in `coordinate`. Ed è anche l'unica che
// parli con una macchina che non è questa, il che la rende quella per cui
// `idempotente` va letto guardando il gestore e non lo schema.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as elenco } from './elenco.js'
import { procedura as geocodifica } from './geocodifica.js'

export const procedureMappa: ProceduraQualunque[] = [
  elenco,
  geocodifica,
]

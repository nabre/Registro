// Le esportazioni: le valutazioni, le presenze, una lezione.
//
// Fanno uscire un foglio e non toccano il registro — `collezioni` è vuoto —
// ma restano scritture perché comandano: rifai questo foglio, adesso.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as lezione } from './lezione.js'
import { procedura as presenze } from './presenze.js'
import { procedura as valutazioni } from './valutazioni.js'

export const procedureEsporta: ProceduraQualunque[] = [
  lezione,
  presenze,
  valutazioni,
]

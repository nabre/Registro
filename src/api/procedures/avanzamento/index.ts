// A che punto è il piano su una lezione.
//
// Una procedura sola, e sta in un'area sua perché il nome è suo: il percorso
// di un file segue il nome della procedura, non la sua grandezza.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as imposta } from './imposta.js'

export const procedureAvanzamento: ProceduraQualunque[] = [
  imposta,
]

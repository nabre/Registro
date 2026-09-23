// Le materie: salvarle, eliminarle, unirne due in una.
//
// Il centralino rispondeva «Materia non trovata.» e «Sono la stessa materia.»
// con lo stesso esito, e chi chiamava da fuori non poteva sapere quale delle
// due si ritenta dopo aver riletto. Adesso la prima è `non-trovato` e la
// seconda `rifiutato`.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'
import { procedura as unisci } from './unisci.js'

export const procedureMaterie: ProceduraQualunque[] = [
  elimina,
  salva,
  unisci,
]

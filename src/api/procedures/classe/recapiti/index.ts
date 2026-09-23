// Le procedure di `classe.recapiti`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'

export const procedureClasseRecapiti: ProceduraQualunque[] = [
  elimina,
  salva,
]

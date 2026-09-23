// Le procedure di `smistamento.lettura`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as attive } from './attive.js'
import { procedura as ferma } from './ferma.js'
import { procedura as impostazioni } from './impostazioni.js'
import { procedura as pagine } from './pagine.js'
import { procedura as tutto } from './tutto.js'

export const procedureSmistamentoLettura: ProceduraQualunque[] = [
  attive,
  ferma,
  impostazioni,
  pagine,
  tutto,
]

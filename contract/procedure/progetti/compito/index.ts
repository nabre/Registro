// Le procedure di `progetti.compito`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '#contract/contract.js'
import { procedura as elimina } from './elimina.js'
import { procedura as fatto } from './fatto.js'
import { procedura as fattoTutti } from './fattoTutti.js'
import { procedura as inizia } from './inizia.js'
import { procedura as proroga } from './proroga.js'
import { procedura as salva } from './salva.js'
import { procedura as togliInizio } from './togliInizio.js'

export const procedureProgettiCompito: ProceduraQualunque[] = [
  elimina,
  fatto,
  fattoTutti,
  inizia,
  proroga,
  salva,
  togliInizio,
]

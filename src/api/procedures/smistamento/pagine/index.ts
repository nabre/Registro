// Le procedure di `smistamento.pagine`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as assegna } from './assegna.js'
import { procedura as assegnaManuale } from './assegnaManuale.js'
import { procedura as riprendi } from './riprendi.js'
import { procedura as scarta } from './scarta.js'

export const procedureSmistamentoPagine: ProceduraQualunque[] = [
  apri,
  assegna,
  assegnaManuale,
  riprendi,
  scarta,
]

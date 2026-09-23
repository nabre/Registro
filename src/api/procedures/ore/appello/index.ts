// Le procedure di `ore.appello`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as campi } from './campi.js'
import { procedura as casella } from './casella.js'
import { procedura as colonna } from './colonna.js'
import { procedura as leggi } from './leggi.js'
import { procedura as riga } from './riga.js'
import { procedura as tutti } from './tutti.js'

export const procedureOreAppello: ProceduraQualunque[] = [
  campi,
  casella,
  colonna,
  leggi,
  riga,
  tutti,
]

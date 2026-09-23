// Le procedure di `valutazioni.allegato`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as aggiungi } from './aggiungi.js'
import { procedura as apri } from './apri.js'
import { procedura as elimina } from './elimina.js'

export const procedureValutazioniAllegato: ProceduraQualunque[] = [
  aggiungi,
  apri,
  elimina,
]

// Le procedure di `microsoft`: gli account con cui il registro legge
// OneDrive. Nessuna tocca una collezione: i gettoni stanno nel portachiavi.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as aggiungi } from './aggiungi.js'
import { procedura as togli } from './togli.js'

export const procedureMicrosoft: ProceduraQualunque[] = [
  aggiungi,
  togli,
]

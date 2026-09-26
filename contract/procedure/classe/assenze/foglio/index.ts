// Le procedure di `classe.assenze.foglio`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../../contract.js'
import { procedura as aggiungi } from './aggiungi.js'
import { procedura as apri } from './apri.js'
import { procedura as togli } from './togli.js'

export const procedureClasseAssenzeFoglio: ProceduraQualunque[] = [
  aggiungi,
  apri,
  togli,
]

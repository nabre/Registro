// Le procedure di `persone.foto`. Elenco a mano: un file non nominato qui non
// si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as imposta } from './imposta.js'
import { procedura as togli } from './togli.js'

export const procedurePersoneFoto: ProceduraQualunque[] = [
  imposta,
  togli,
]

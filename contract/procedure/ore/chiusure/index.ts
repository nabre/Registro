// Le procedure di `ore.chiusure`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as togli } from './togli.js'

export const procedureOreChiusure: ProceduraQualunque[] = [
  togli,
]

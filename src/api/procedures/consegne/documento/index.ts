// Le procedure di `consegne.documento`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as allega } from './allega.js'
import { procedura as apri } from './apri.js'
import { procedura as togli } from './togli.js'

export const procedureConsegneDocumento: ProceduraQualunque[] = [
  allega,
  apri,
  togli,
]

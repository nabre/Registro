// Le procedure di `smistamento.bozza`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as conferma } from './conferma.js'

export const procedureSmistamentoBozza: ProceduraQualunque[] = [
  conferma,
]

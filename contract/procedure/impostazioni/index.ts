// Le impostazioni del documento, salvate da chi le ha cambiate. Lo schema è
// l'unico punto in cui la loro forma è dichiarata a chi chiama da fuori.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as salva } from './salva.js'

export const procedureImpostazioni: ProceduraQualunque[] = [
  salva,
]

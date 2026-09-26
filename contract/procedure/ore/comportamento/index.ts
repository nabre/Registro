// Le procedure di `ore.comportamento`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as cella } from './cella.js'

export const procedureOreComportamento: ProceduraQualunque[] = [
  cella,
]

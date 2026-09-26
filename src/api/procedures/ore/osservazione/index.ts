// Le procedure di `ore.osservazione`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'

export const procedureOreOsservazione: ProceduraQualunque[] = [
  elimina,
  salva,
]

// La supplenza in cui manco io: il pacchetto per chi tiene le mie ore. Non
// tocca il registro (`collezioni` vuoto), ma scrive uno zip e manda una mail.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '#contract/contract.js'
import { procedura as prepara } from './prepara.js'

export const procedureSupplenza: ProceduraQualunque[] = [
  prepara,
]

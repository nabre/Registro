// Le procedure di `smistamento.assenze`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as assegna } from './assegna.js'

export const procedureSmistamentoAssenze: ProceduraQualunque[] = [
  assegna,
]

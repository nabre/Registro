// Le procedure di `smistamento.lettura`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as attive } from './attive.js'
import { procedura as ferma } from './ferma.js'
import { procedura as impostazioni } from './impostazioni.js'
import { procedura as pagine } from './pagine.js'
import { procedura as tutto } from './tutto.js'

export const procedureSmistamentoLettura: ProceduraQualunque[] = [
  attive,
  ferma,
  impostazioni,
  pagine,
  tutto,
]

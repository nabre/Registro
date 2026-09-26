// L'orario: imporlo a mano o generarlo. Il lavoro sta in
// `src/actions/register.ts`; qui forma dell'ingresso e guardia sul corso.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as genera } from './genera.js'
import { procedura as imposta } from './imposta.js'

export const procedureOrario: ProceduraQualunque[] = [
  genera,
  imposta,
]

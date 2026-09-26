// I fogli che escono dal registro. Compongono PDF e non scrivono nel registro
// (`collezioni` vuoto), ma sono comandi, quindi scritture. Il lavoro sta nei
// gestori di `src/actions/reports.ts`.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as completo } from './completo.js'
import { procedura as genera } from './genera.js'

export const procedureRapporti: ProceduraQualunque[] = [
  completo,
  genera,
]

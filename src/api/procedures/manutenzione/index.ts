// Riparare il documento: rimette a posto quel che il dominio sa essere storto
// (`domain/repairs.ts`). Da non chiamare per sbaglio.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as ripara } from './ripara.js'

export const procedureManutenzione: ProceduraQualunque[] = [
  ripara,
]

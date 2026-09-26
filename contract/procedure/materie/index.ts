// Le materie: salvarle, eliminarle, unirne due. «Materia non trovata.» è
// `non-trovato` (si rilegge), «Sono la stessa materia.» è `rifiutato` (mai).
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'
import { procedura as unisci } from './unisci.js'

export const procedureMaterie: ProceduraQualunque[] = [
  elimina,
  salva,
  unisci,
]

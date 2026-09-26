// A che punto è il piano su una lezione. Un'area sua perché il percorso segue
// il nome della procedura.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as imposta } from './imposta.js'

export const procedureAvanzamento: ProceduraQualunque[] = [
  imposta,
]

// I corsi: una materia a una classe. `corsi.elenco` è la prima lettura di chi
// arriva da fuori; le altre cambiano l'anagrafica con i gestori di
// `src/actions/register.ts`. `corsi.crea` è idempotente (torna il corso che c'è
// già).
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as crea } from './crea.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'

export const procedureCorsi: ProceduraQualunque[] = [
  crea,
  elenco,
  elimina,
  salva,
]

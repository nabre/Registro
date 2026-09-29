// Gli anni scolastici: crearne uno, salvarlo, dire com'è fatta una settimana,
// collegarlo al calendario ufficiale o staccarlo.
// `anni.crea` crea un documento e non è idempotente.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as calendario } from './calendario.js'
import { procedura as crea } from './crea.js'
import { procedura as salva } from './salva.js'
import { procedura as settimana } from './settimana.js'

export const procedureAnni: ProceduraQualunque[] = [
  calendario,
  crea,
  salva,
  settimana,
]

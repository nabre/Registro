// Le procedure di `classe.assenze`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as elimina } from './elimina.js'
import { procedura as importa } from './importa.js'
import { procedura as invia } from './invia.js'
import { procedura as salva } from './salva.js'
import { procedura as spunta } from './spunta.js'
import { procedureClasseAssenzeFoglio } from './foglio/index.js'

export const procedureClasseAssenze: ProceduraQualunque[] = [
  elimina,
  importa,
  invia,
  salva,
  spunta,
  ...procedureClasseAssenzeFoglio,
]

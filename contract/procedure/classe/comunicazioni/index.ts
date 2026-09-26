// Le procedure di `classe.comunicazioni`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as elimina } from './elimina.js'
import { procedura as invia } from './invia.js'
import { procedura as salva } from './salva.js'
import { procedura as spunta } from './spunta.js'

export const procedureClasseComunicazioni: ProceduraQualunque[] = [
  elimina,
  invia,
  salva,
  spunta,
]

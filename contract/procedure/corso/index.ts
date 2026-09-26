// Le presenze di un corso: una lettura con il conto già fatto dal dominio,
// mai il dato grezzo da ricontare. La forma è piatta e dichiarata: `RigaCorso`
// può cambiare, la risposta di `corso.presenze` è un contratto.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as presenze } from './presenze.js'

export const procedureCorso: ProceduraQualunque[] = [
  presenze,
]

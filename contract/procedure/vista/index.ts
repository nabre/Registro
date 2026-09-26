// Le pagine del registro, aperte da fuori della pagina. `vista.apri` ha un'area
// sua: non è dell'assistente (che è solo un chiamante) né del sistema.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apri } from './apri.js'

export const procedureVista: ProceduraQualunque[] = [
  apri,
]

// La carta intestata: il logo, che sta dentro il documento d'anno ed è un file
// da scegliere e copiare (lavoro in `src/actions/templates.ts`). Sede, nome e
// firma sono impostazioni del documento (`impostazioni.salva`).
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as logo } from './logo.js'
import { procedura as togliLogo } from './togliLogo.js'

export const procedureIntestazione: ProceduraQualunque[] = [
  logo,
  togliLogo,
]

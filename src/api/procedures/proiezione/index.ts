// La finestra che mette il registro davanti alla classe: accende uno schermo,
// lo punta, lo spegne. La seconda finestra non chiama procedure: il contenuto
// glielo manda già calcolato `panels/projection.ts`.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as chiudi } from './chiudi.js'
import { procedura as impostazioni } from './impostazioni.js'
import { procedura as mira } from './mira.js'

export const procedureProiezione: ProceduraQualunque[] = [
  apri,
  chiudi,
  impostazioni,
  mira,
]

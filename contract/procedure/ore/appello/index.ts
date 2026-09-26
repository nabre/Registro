// Le procedure di `ore.appello`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as campi } from './campi.js'
import { procedura as casella } from './casella.js'
import { procedura as colonna } from './colonna.js'
import { procedura as leggi } from './leggi.js'
import { procedura as riga } from './riga.js'
import { procedura as tutti } from './tutti.js'

export const procedureOreAppello: ProceduraQualunque[] = [
  campi,
  casella,
  colonna,
  leggi,
  riga,
  tutti,
]

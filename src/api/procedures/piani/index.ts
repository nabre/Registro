// I piani di lezione, che vivono oltre l'anno in cui si usano. `idempotente` e
// `collezioni` si leggono guardando il gestore: `piani.duplica` ricopia ogni
// file del piano. Il lavoro sta in `src/actions/plans.ts`.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as assegna } from './assegna.js'
import { procedura as duplica } from './duplica.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as leggi } from './leggi.js'
import { procedura as perLezione } from './perLezione.js'
import { procedura as salva } from './salva.js'

export const procedurePiani: ProceduraQualunque[] = [
  assegna,
  duplica,
  elenco,
  elimina,
  leggi,
  perLezione,
  salva,
]

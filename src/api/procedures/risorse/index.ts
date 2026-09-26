// Le risorse di un piano: file veri in una cartella vera. `risorse.aggiungi`
// apre un dialogo e copia un file, quindi non è idempotente; le altre non
// aggiungono niente al disco. Il lavoro sta in `src/actions/plans.ts`.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as aggiungi } from './aggiungi.js'
import { procedura as apri } from './apri.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'
import { procedura as sposta } from './sposta.js'

export const procedureRisorse: ProceduraQualunque[] = [
  aggiungi,
  apri,
  elimina,
  salva,
  sposta,
]

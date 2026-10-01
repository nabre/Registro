// Le classi come anagrafica: salvarle, eliminarle, duplicarle, portarle da un
// altro anno (`classi.altrove` le elenca, `classi.importa` le porta).
// `classi.duplica` non è idempotente. Il lavoro sta in `core/azioni/register.ts`.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '#contract/contract.js'
import { procedura as altrove } from './altrove.js'
import { procedura as duplica } from './duplica.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as importa } from './importa.js'
import { procedura as modifica } from './modifica.js'
import { procedura as salva } from './salva.js'

export const procedureClassi: ProceduraQualunque[] = [
  altrove,
  duplica,
  elenco,
  elimina,
  importa,
  modifica,
  salva,
]

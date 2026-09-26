// Le domande sul registro intero (riassunto, integrità) e l'importazione da un
// altro documento `.regi`: sceglierlo (`registro.sfoglia`), leggerlo a blocchi
// (`registro.altrove`), importarlo (`registro.importa`).
//
// Il pannello riceve già l'intero `Registro`; chi arriva da fuori comincia da
// `registro.riassunto` per sapere quali anni esistono.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as altrove } from './altrove.js'
import { procedura as importa } from './importa.js'
import { procedura as integrita } from './integrita.js'
import { procedura as riassunto } from './riassunto.js'
import { procedura as sfoglia } from './sfoglia.js'

export const procedureRegistro: ProceduraQualunque[] = [
  altrove,
  importa,
  integrita,
  riassunto,
  sfoglia,
]

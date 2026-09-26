// Le procedure di `smistamento.pdf`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as attribuisci } from './attribuisci.js'
import { procedura as carica } from './carica.js'
import { procedura as deposita } from './deposita.js'
import { procedura as dividi } from './dividi.js'
import { procedura as elimina } from './elimina.js'

export const procedureSmistamentoPdf: ProceduraQualunque[] = [
  apri,
  attribuisci,
  carica,
  deposita,
  dividi,
  elimina,
]

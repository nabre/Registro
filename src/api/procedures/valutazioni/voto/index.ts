// Le procedure di `valutazioni.voto`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as imposta } from './imposta.js'
import { procedura as riconsegna } from './riconsegna.js'

export const procedureValutazioniVoto: ProceduraQualunque[] = [
  imposta,
  riconsegna,
]

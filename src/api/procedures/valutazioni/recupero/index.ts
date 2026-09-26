// Le procedure di `valutazioni.recupero`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as imposta } from './imposta.js'

export const procedureValutazioniRecupero: ProceduraQualunque[] = [
  imposta,
]

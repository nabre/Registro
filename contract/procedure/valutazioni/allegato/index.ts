// Le procedure di `valutazioni.allegato`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as aggiungi } from './aggiungi.js'
import { procedura as apri } from './apri.js'
import { procedura as elimina } from './elimina.js'

export const procedureValutazioniAllegato: ProceduraQualunque[] = [
  aggiungi,
  apri,
  elimina,
]

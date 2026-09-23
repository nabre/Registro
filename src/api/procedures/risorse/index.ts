// Le risorse di un piano: non sono righe, sono file veri in una cartella vera.
//
// È la ragione per cui `idempotente` qui va letto guardando il gestore e non
// lo schema: `risorse.aggiungi` apre un dialogo di sistema e copia un file —
// chiamarla due volte fa due copie, e ritentarla dopo un guasto di trasporto
// non è innocuo. Le altre non aggiungono niente al disco.
//
// Il lavoro sta in `src/actions/plans.ts` e ci resta. Qui ci sono la forma
// dell'ingresso e le guardie che distinguono «non c'è più» da «non si può».
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

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

// I piani di lezione.
//
// Un piano è l'unica cosa del registro che vive più a lungo dell'anno in cui la
// si usa. È per questo che qui i due campi del contratto che altrove si
// riempiono quasi per abitudine — `idempotente` e `collezioni` — vanno letti
// guardando il gestore e non lo schema: `piani.duplica` ricopia ogni file del
// piano, uno per uno, e chiamarla due volte fa due copie.
//
// Per il resto la regola è quella di sempre: il lavoro sta in
// `src/actions/plans.ts` e ci resta. Qui ci sono la forma dell'ingresso, le
// guardie che distinguono «non c'è più» da «non si può», e il codice d'errore
// giusto per l'uno e per l'altro.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

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

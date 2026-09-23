// Le classi come anagrafica: salvarle, eliminarle, duplicarle.
//
// `classi.duplica` fa persone nuove a ogni chiamata e per questo non è
// idempotente — è il campo del contratto che dice a chi chiama da fuori se può
// ritentare dopo un errore di trasporto, e qui la risposta è no.
//
// Il lavoro resta intero in `src/actions/register.ts`: nessuna regola si sposta.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as duplica } from './duplica.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'

export const procedureClassi: ProceduraQualunque[] = [
  duplica,
  elenco,
  elimina,
  salva,
]

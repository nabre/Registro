// Riparare il documento.
//
// Una procedura sola, e la più pericolosa a chiamarla per sbaglio: rimette a
// posto quel che il dominio sa essere storto. Il lavoro sta in
// `domain/repairs.ts` e ci resta.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as ripara } from './ripara.js'

export const procedureManutenzione: ProceduraQualunque[] = [
  ripara,
]

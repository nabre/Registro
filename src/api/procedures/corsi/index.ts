// I corsi: un corso è una materia a una classe.
//
// `corsi.elenco` è la lettura che chi arriva da fuori chiama per prima — non
// ha lo stato che l'host spinge al pannello dopo ogni scrittura, e senza un
// elenco non sa nemmeno che cosa chiedere. Le altre tre cambiano l'anagrafica
// e passano la palla ai gestori di `src/actions/register.ts`.
//
// `corsi.crea` torna il corso che c'è già ed è idempotente: dichiararlo è
// l'unica cosa che permette a chi chiama da fuori di ritentare senza paura.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as crea } from './crea.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as salva } from './salva.js'

export const procedureCorsi: ProceduraQualunque[] = [
  crea,
  elenco,
  elimina,
  salva,
]

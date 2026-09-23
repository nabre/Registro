// L'orario: imporlo a mano, o generarlo.
//
// Due scritture dell'anagrafica, il lavoro in `src/actions/register.ts`. Qui
// c'è la forma dell'ingresso e la guardia che il corso esista davvero.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as genera } from './genera.js'
import { procedura as imposta } from './imposta.js'

export const procedureOrario: ProceduraQualunque[] = [
  genera,
  imposta,
]

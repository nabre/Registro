// Gli anni scolastici: crearne uno, salvarlo, dire com'è fatta una settimana.
//
// È la parte che si tocca a settembre e poi quasi più, ed è anche quella in cui
// un ingresso storto fa il danno più lungo: un id che non esiste non rompe
// niente subito, rompe a gennaio.
//
// `anni.crea` apre un dialogo di sistema e non è idempotente: chiamarla due
// volte non è chiamarla una volta sola, e lo dichiara invece di lasciarlo
// dedurre.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as crea } from './crea.js'
import { procedura as salva } from './salva.js'
import { procedura as settimana } from './settimana.js'

export const procedureAnni: ProceduraQualunque[] = [
  crea,
  salva,
  settimana,
]

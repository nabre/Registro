// La finestra che mette il registro davanti alla classe.
//
// Accende uno schermo, lo punta, lo spegne. Non scrive nel registro, e la
// seconda finestra non chiama procedure: il contenuto glielo spedisce già
// calcolato `panels/projection.ts`. Per questo `'proiezione'` è un'origine
// che nel giornale non compare — il nome c'è per il giorno in cui servisse.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as chiudi } from './chiudi.js'
import { procedura as impostazioni } from './impostazioni.js'
import { procedura as mira } from './mira.js'

export const procedureProiezione: ProceduraQualunque[] = [
  apri,
  chiudi,
  impostazioni,
  mira,
]

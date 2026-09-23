// Che cosa c'è nella cartella dei dati: una lettura e basta.
//
// Chiede e non comanda, quindi passa dal canale delle domande e non dalla coda
// delle scritture. Non tocca nessuna raccolta.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as inventario } from './inventario.js'

export const procedureDocumenti: ProceduraQualunque[] = [
  inventario,
]

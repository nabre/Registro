// Che cosa c'è nella cartella dei dati: una lettura, dal canale delle domande.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as inventario } from './inventario.js'

export const procedureDocumenti: ProceduraQualunque[] = [
  inventario,
]

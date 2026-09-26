// La finestra del registro: lo zoom e lo schermo intero. Parlano della finestra,
// non della macchina (quelle sono in `sistema`). Sono procedure perché sono
// voci della tendina «File» della barra del titolo disegnata dal registro.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as schermoIntero } from './schermoIntero.js'
import { procedura as zoom } from './zoom.js'

export const procedureFinestra: ProceduraQualunque[] = [
  schermoIntero,
  zoom,
]

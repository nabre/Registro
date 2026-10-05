// Le finestre del registro: lo zoom e lo schermo intero, e le finestre in più
// (aprirne una, portarne davanti una, chiuderla). Parlano della finestra, non
// della macchina (quelle sono in `sistema`). Sono procedure perché sono voci
// della tendina «File», della palette e del menu delle finestre.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '#contract/contract.js'
import { procedura as chiudi } from './chiudi.js'
import { procedura as nuova } from './nuova.js'
import { procedura as porta } from './porta.js'
import { procedura as principale } from './principale.js'
import { procedura as schermoIntero } from './schermoIntero.js'
import { procedura as zoom } from './zoom.js'

export const procedureFinestra: ProceduraQualunque[] = [
  chiudi,
  nuova,
  porta,
  principale,
  schermoIntero,
  zoom,
]

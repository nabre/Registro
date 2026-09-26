// La mappa: dove sta la gente, e dove sta un indirizzo cercandolo in rete.
// `geocodifica` scrive in `coordinate` e parla con un servizio esterno: la sua
// idempotenza si legge nel gestore, non nello schema.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as elenco } from './elenco.js'
import { procedura as geocodifica } from './geocodifica.js'

export const procedureMappa: ProceduraQualunque[] = [
  elenco,
  geocodifica,
]

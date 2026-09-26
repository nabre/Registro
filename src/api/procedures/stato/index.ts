// Lo stato del registro: leggerlo, rileggerlo da disco, salvarlo. `stato.leggi`
// serve a chi arriva da fuori senza lo stato spinto al pannello; `stato.salva`
// scrive su disco quel che è già in memoria (`collezioni` vuoto).
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as leggi } from './leggi.js'
import { procedura as ricarica } from './ricarica.js'
import { procedura as salva } from './salva.js'

export const procedureStato: ProceduraQualunque[] = [
  leggi,
  ricarica,
  salva,
]

// Lo stato del registro: leggerlo, rileggerlo da disco, salvarlo.
//
// `stato.leggi` è la lettura da cui passa chiunque arrivi da fuori senza lo
// stato che l'host spinge al pannello. `stato.salva` scrive su disco quel che
// era già in memoria: è una scrittura che non cambia niente di quel che c'è
// scritto, e `collezioni` vuoto lo dice.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as leggi } from './leggi.js'
import { procedura as ricarica } from './ricarica.js'
import { procedura as salva } from './salva.js'

export const procedureStato: ProceduraQualunque[] = [
  leggi,
  ricarica,
  salva,
]

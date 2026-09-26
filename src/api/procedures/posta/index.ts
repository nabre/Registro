// La posta: collegare la casella, provarla, mandare una mail di prova. Nessuna
// tocca una collezione; `idempotente` dice che cosa succede fuori, e per una
// mail che parte vuol dire uno o due messaggi.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as collega } from './collega.js'
import { procedura as invioProva } from './invioProva.js'
import { procedura as prova } from './prova.js'
import { procedura as scollega } from './scollega.js'

export const procedurePosta: ProceduraQualunque[] = [
  collega,
  invioProva,
  prova,
  scollega,
]

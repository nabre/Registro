// Le procedure di `progetti`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '#contract/contract.js'
import { procedura as cella } from './cella.js'
import { procedura as elimina } from './elimina.js'
import { procedura as integra } from './integra.js'
import { procedura as leggi } from './leggi.js'
import { procedura as salva } from './salva.js'
import { procedureProgettiCompito } from './compito/index.js'
import { procedureProgettiGiudizio } from './giudizio/index.js'
import { procedureProgettiIntegrazione } from './integrazione/index.js'

export const procedureProgetti: ProceduraQualunque[] = [
  ...procedureProgettiCompito,
  ...procedureProgettiGiudizio,
  ...procedureProgettiIntegrazione,
  cella,
  elimina,
  integra,
  leggi,
  salva,
]

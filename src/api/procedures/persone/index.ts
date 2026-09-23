// Chi frequenta: toglierne una, metterle o levarle la foto, importarne molte.
//
// `persone.importa` legge un file scelto in un dialogo di sistema e non è
// idempotente: due chiamate sono due importazioni. Le altre tre sì, e lo
// dicono.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as argomenti } from './argomenti.js'
import { procedura as assenze } from './assenze.js'
import { procedura as cerca } from './cerca.js'
import { procedura as elimina } from './elimina.js'
import { procedura as importa } from './importa.js'
import { procedura as medie } from './medie.js'
import { procedura as scheda } from './scheda.js'
import { procedurePersoneFoto } from './foto/index.js'

export const procedurePersone: ProceduraQualunque[] = [
  argomenti,
  assenze,
  cerca,
  elimina,
  importa,
  ...procedurePersoneFoto,
  medie,
  scheda,
]

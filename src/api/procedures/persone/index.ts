// Chi frequenta: toglierne una, metterle o levarle la foto, importarne molte.
// `persone.importa` apre un dialogo di sistema e non è idempotente.
//
// Elenco a mano: un file non nominato qui non si registra.

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

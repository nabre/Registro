// Le procedure di `llm`: un file per procedura, questo
// le raccoglie, e con loro gli indici delle cartelle sotto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as annulla } from './annulla.js'
import { procedura as catalogo } from './catalogo.js'
import { procedura as elimina } from './elimina.js'
import { procedura as file } from './file.js'
import { procedura as importa } from './importa.js'
import { procedura as modelli } from './modelli.js'
import { procedura as scarica } from './scarica.js'
import { procedura as scegli } from './scegli.js'

export const procedureLlm: ProceduraQualunque[] = [
  annulla,
  catalogo,
  elimina,
  file,
  importa,
  modelli,
  scarica,
  scegli,
]

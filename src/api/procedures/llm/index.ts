// Le procedure di `llm`. Elenco a mano: un file non nominato qui
// non si registra.

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

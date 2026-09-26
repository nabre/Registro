// Le procedure di `check`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as colonne } from './colonne.js'
import { procedura as data } from './data.js'
import { procedura as leggi } from './leggi.js'
import { procedura as lezione } from './lezione.js'
import { procedura as spunta } from './spunta.js'

export const procedureCheck: ProceduraQualunque[] = [
  colonne,
  data,
  leggi,
  lezione,
  spunta,
]

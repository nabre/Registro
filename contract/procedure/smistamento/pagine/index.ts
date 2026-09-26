// Le procedure di `smistamento.pagine`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as assegna } from './assegna.js'
import { procedura as assegnaManuale } from './assegnaManuale.js'
import { procedura as riprendi } from './riprendi.js'
import { procedura as scarta } from './scarta.js'

export const procedureSmistamentoPagine: ProceduraQualunque[] = [
  apri,
  assegna,
  assegnaManuale,
  riprendi,
  scarta,
]

// Le procedure di `aggiornamenti`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as controlla } from './controlla.js'
import { procedura as installa } from './installa.js'
import { procedura as scarica } from './scarica.js'
import { procedura as stato } from './stato.js'

export const procedureAggiornamenti: ProceduraQualunque[] = [
  controlla,
  installa,
  scarica,
  stato,
]

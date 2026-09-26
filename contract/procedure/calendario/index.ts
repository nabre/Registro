// Le procedure di `calendario`. Elenco a mano: un file non nominato qui
// non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as aggiorna } from './aggiorna.js'
import { procedura as aggiungi } from './aggiungi.js'
import { procedura as applica } from './applica.js'
import { procedura as confronta } from './confronta.js'
import { procedura as eventi } from './eventi.js'
import { procedura as modifica } from './modifica.js'
import { procedura as togli } from './togli.js'

export const procedureCalendario: ProceduraQualunque[] = [
  aggiorna,
  aggiungi,
  applica,
  confronta,
  eventi,
  modifica,
  togli,
]

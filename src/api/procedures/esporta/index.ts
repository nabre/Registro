// Le esportazioni: valutazioni, presenze, una lezione. Fanno uscire un foglio
// senza toccare il registro (`collezioni` vuoto), ma sono comandi, quindi
// scritture.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as lezione } from './lezione.js'
import { procedura as presenze } from './presenze.js'
import { procedura as valutazioni } from './valutazioni.js'

export const procedureEsporta: ProceduraQualunque[] = [
  lezione,
  presenze,
  valutazioni,
]

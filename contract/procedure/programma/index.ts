// Il programma in sé: le sue impostazioni (salvarne una, azzerarle, sceglierne
// un percorso) e l'uscita. La chiave la controlla lo schema: da fuori si sceglie
// quale impostazione toccare, e una chiave inesistente si ferma prima.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as azzera } from './azzera.js'
import { procedura as esci } from './esci.js'
import { procedura as salva } from './salva.js'
import { procedura as sfoglia } from './sfoglia.js'

export const procedureProgramma: ProceduraQualunque[] = [
  azzera,
  esci,
  salva,
  sfoglia,
]

// I fascicoli: più fogli rimessi insieme in un documento solo. Non scrivono nel
// registro (`collezioni` vuoto), ma compongono e cancellano PDF: sono comandi,
// quindi scritture.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as aggiorna } from './aggiorna.js'
import { procedura as crea } from './crea.js'
import { procedura as elimina } from './elimina.js'

export const procedureComposizioni: ProceduraQualunque[] = [
  aggiorna,
  crea,
  elimina,
]

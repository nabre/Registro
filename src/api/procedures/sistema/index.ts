// I comandi che parlano con il sistema operativo: aprire una cartella, chiamare
// un numero, scrivere un messaggio, mostrare un avviso. Nessuna collezione; il
// contratto dice genere e se si possono ritentare.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apriCartella } from './apriCartella.js'
import { procedura as chiama } from './chiama.js'
import { procedura as messaggio } from './messaggio.js'
import { procedura as scrivi } from './scrivi.js'

export const procedureSistema: ProceduraQualunque[] = [
  apriCartella,
  chiama,
  messaggio,
  scrivi,
]

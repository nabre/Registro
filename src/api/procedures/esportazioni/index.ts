// I fogli già usciti: aprirli, mostrarli nella cartella, buttarli via. Cambia
// il documento d'anno, non il `Registro`. I percorsi dell'archivio contengono
// cognomi: per questo il nucleo non fa uscire il messaggio delle eccezioni.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as elimina } from './elimina.js'
import { procedura as mostra } from './mostra.js'

export const procedureEsportazioni: ProceduraQualunque[] = [
  apri,
  elimina,
  mostra,
]

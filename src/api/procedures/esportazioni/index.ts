// I fogli già usciti: aprirli, mostrarli nella cartella, buttarli via.
//
// Il documento d'anno cambia, il `Registro` no. `esportazioni.mostra` è la
// procedura che ha insegnato al nucleo a non far uscire il messaggio di
// un'eccezione: i percorsi dell'archivio contengono il cognome di una persona,
// e un guasto li mostrava a chi aveva premuto. Adesso esce il tracciato, e il
// racconto intero resta in console.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as elimina } from './elimina.js'
import { procedura as mostra } from './mostra.js'

export const procedureEsportazioni: ProceduraQualunque[] = [
  apri,
  elimina,
  mostra,
]

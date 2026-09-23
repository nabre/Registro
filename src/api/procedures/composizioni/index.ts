// I fascicoli: più fogli rimessi insieme in un documento solo.
//
// Non scrivono nel registro — compongono PDF e li buttano via — e si vede in
// `collezioni`, che qui è vuoto. Restano scritture lo stesso, e non per
// formalità: una scrittura è una cosa che *comanda*, e il canale delle domande
// esiste per chi chiede senza comandare.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as aggiorna } from './aggiorna.js'
import { procedura as crea } from './crea.js'
import { procedura as elimina } from './elimina.js'

export const procedureComposizioni: ProceduraQualunque[] = [
  aggiorna,
  crea,
  elimina,
]

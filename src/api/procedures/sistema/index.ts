// I comandi che parlano con il sistema operativo: aprire una cartella,
// chiamare un numero, scrivere un messaggio, mostrare un avviso.
//
// Non toccano nessuna collezione, e il contratto qui serve a dire che cosa
// succede *fuori*: una di queste alza la cornetta, una apre una finestra del
// sistema. Fin qui erano azioni indistinguibili l'una dall'altra, tutte «ok»;
// adesso dichiarano il genere, le raccolte che toccano (nessuna) e se si
// possono ritentare.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

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

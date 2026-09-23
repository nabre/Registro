// Le consegne: darle, spuntarle, raccoglierle e spedirle — e i due file che
// possono restare appesi a una, le firme di ritiro e il documento del singolo.
//
// Sono le azioni in cui il contratto serve più che altrove, e per un motivo
// preciso: qui un id sbagliato non fa un dato storto che si corregge, fa un
// documento che va alla famiglia sbagliata. `consegne.distribuisci` manda
// e-mail vere, con un allegato vero; `consegne.raccogli` copia un file nella
// cartella dei dati. Di tutte le azioni del registro sono quelle in cui
// «riprovare dopo un errore di trasporto» non è gratis, ed è la ragione per
// cui `idempotente` qui è dichiarato `false` più di una volta.
//
// Il resto è come altrove: il lavoro resta nei gestori di
// `src/actions/assignments.ts`, che sanno che una spunta con un documento non si
// toglie e che una bozza non è una consegna fatta. Qui ci sono la forma
// dell'ingresso, la guardia che la consegna esista davvero e il codice
// d'errore giusto — «non c'è più» separato da «non si può».
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as consegnato } from './consegnato.js'
import { procedura as distribuisci } from './distribuisci.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as raccogli } from './raccogli.js'
import { procedura as salva } from './salva.js'
import { procedura as spunta } from './spunta.js'
import { procedura as spuntaTutti } from './spuntaTutti.js'
import { procedureConsegneDocumento } from './documento/index.js'
import { procedureConsegneFile } from './file/index.js'
import { procedureConsegneFirme } from './firme/index.js'

export const procedureConsegne: ProceduraQualunque[] = [
  consegnato,
  distribuisci,
  elenco,
  elimina,
  raccogli,
  salva,
  spunta,
  spuntaTutti,
  ...procedureConsegneDocumento,
  ...procedureConsegneFile,
  ...procedureConsegneFirme,
]

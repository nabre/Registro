// Lo smistamento: il PDF che arriva, le pagine che restano da decidere.
//
// È l'area con più procedure del registro — diciannove — ed è anche quella con
// più cose che si muovono fuori dall'archivio: byte che entrano in quarantena,
// ritagli che escono nel lettore del sistema, file che vanno nel cestino, una
// coda OCR che macina per conto suo. Il contratto qui serve più che altrove
// proprio per questo: un `pagine: ["3"]` arrivato da fuori non deve diventare
// un ritaglio di zero pagine, e «quello smistamento non c'è più» deve tornare
// con un codice che si distingue da «quella casella è già piena» — il primo si
// ritenta dopo aver riletto, il secondo mai.
//
// Il lavoro non si è spostato di una riga: ogni procedura ripassa la palla al
// gestore di sempre in `src/actions/sorting.ts`.
//
// **Gli schemi sono volutamente larghi.** Quasi ogni gestore di quest'area sa
// già dire di no con la sua frase — «il file trascinato è vuoto», «nessuna
// pagina da buttare via», «quella richiesta non è stata fatta a questa
// persona» — e uno schema che rifiutasse prima toglierebbe quella frase per
// metterci «ingresso non valido». Quel che si controlla qui è la *forma*: che
// un numero sia un numero e una scelta sia fra quelle. Il merito resta dov'è.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedureSmistamentoAssenze } from './assenze/index.js'
import { procedureSmistamentoBozza } from './bozza/index.js'
import { procedureSmistamentoFirme } from './firme/index.js'
import { procedureSmistamentoLettura } from './lettura/index.js'
import { procedureSmistamentoPagine } from './pagine/index.js'
import { procedureSmistamentoPdf } from './pdf/index.js'

export const procedureSmistamento: ProceduraQualunque[] = [
  ...procedureSmistamentoAssenze,
  ...procedureSmistamentoBozza,
  ...procedureSmistamentoFirme,
  ...procedureSmistamentoLettura,
  ...procedureSmistamentoPagine,
  ...procedureSmistamentoPdf,
]

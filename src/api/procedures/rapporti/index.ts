// I fogli che escono dal registro.
//
// Compongono PDF e li mettono insieme: nessuna di queste procedure scrive nel
// registro, e si vede in `collezioni`, vuoto. Restano scritture lo stesso, e
// non per formalità: una scrittura è una cosa che *comanda* — rifai questo
// foglio — e il canale delle domande esiste per chi chiede senza comandare.
//
// Il lavoro non si è spostato di un metro: ogni procedura passa la palla al
// gestore di sempre in `src/actions/reports.ts`.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as completo } from './completo.js'
import { procedura as genera } from './genera.js'
import { procedura as modelli } from './modelli.js'

export const procedureRapporti: ProceduraQualunque[] = [
  completo,
  genera,
  modelli,
]

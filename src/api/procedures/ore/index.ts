// L'ora di lezione: l'appello e la matrice del comportamento.
//
// Sono le prime azioni passate sotto contratto, e non per caso: sono quelle
// che si chiamano più spesso — una casella per persona per unità didattica,
// trenta volte al minuto mentre la classe entra — ed erano quelle con meno
// rete. Il tipo TypeScript diceva `StatoPresenza`, ma il tipo non arriva fino
// a qui: `src/agenda.ts` ricontrollava gli stati a mano (`STATI.includes`)
// proprio perché il widget è un altro webview, e un altro webview è un'altra
// sponda. Adesso quel controllo lo fa il nucleo, una volta, per tutti quelli
// che chiamano — compresa la riga di comando, che prima non esisteva.
//
// Il lavoro non si è spostato: ogni procedura passa la palla al gestore di
// sempre in `src/actions/hours.ts`. Nei file di qui ci sono la forma
// dell'ingresso, il controllo che la voce esista davvero e il codice d'errore
// giusto; le guardie che più d'una si divide stanno in `common.ts`.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as duplica } from './duplica.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as leggi } from './leggi.js'
import { procedura as prossima } from './prossima.js'
import { procedura as salva } from './salva.js'
import { procedura as sposta } from './sposta.js'
import { procedura as stato } from './stato.js'
import { procedura as testi } from './testi.js'
import { procedureOreAppello } from './appello/index.js'
import { procedureOreComportamento } from './comportamento/index.js'
import { procedureOreOsservazione } from './osservazione/index.js'

export const procedureOre: ProceduraQualunque[] = [
  duplica,
  elenco,
  elimina,
  leggi,
  prossima,
  salva,
  sposta,
  stato,
  testi,
  ...procedureOreAppello,
  ...procedureOreComportamento,
  ...procedureOreOsservazione,
]

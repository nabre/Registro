// L'ora di lezione: l'appello e la matrice del comportamento, le azioni
// chiamate più spesso. Ogni procedura passa il lavoro al gestore in
// `src/actions/hours.ts`; qui stanno forma dell'ingresso, controllo che la voce
// esista e codice d'errore. Le guardie condivise stanno in `common.ts`.
//
// Elenco a mano: un file non nominato qui non si registra.

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
import { procedureOreChiusure } from './chiusure/index.js'
import { procedureOreComportamento } from './comportamento/index.js'
import { procedureOreOsservazione } from './osservazione/index.js'

export const procedureOre: ProceduraQualunque[] = [
  ...procedureOreChiusure,
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

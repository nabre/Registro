// I documenti d'anno: aprirne uno, chiuderlo, mettergli una stella, scordarlo.
//
// Quattro azioni che il registro non lo cambiano mai: aprire un documento e
// chiuderlo sono lavoro del guscio — possono finire con l'applicazione che si
// riavvia — mentre la stella e l'oblio toccano un elenco di percorsi in
// `userData`. Per tutte e quattro `collezioni` è vuoto, ed è il caso in cui
// dichiararlo serve di più: sono proprio quelle che, viste da fuori, sembrano
// scritture e non lo sono.
//
// Il lavoro resta dov'era, in `src/actions/documents.ts`. Qui c'è la forma
// dell'ingresso e nient'altro: un percorso che non sta nell'elenco non è un
// errore — mettere la stella lo aggiunge, e dimenticare lascia cadere quel che
// non trova — quindi non c'è nessuna guardia da mettere, e metterla romperebbe
// il modo in cui un documento nuovo entra fra i preferiti.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apri } from './apri.js'
import { procedura as chiudi } from './chiudi.js'
import { procedura as dimentica } from './dimentica.js'
import { procedura as preferito } from './preferito.js'

export const procedureDocumento: ProceduraQualunque[] = [
  apri,
  chiudi,
  dimentica,
  preferito,
]

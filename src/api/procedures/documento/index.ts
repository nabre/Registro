// I documenti d'anno: aprirne uno, chiuderlo, mettergli una stella,
// dimenticarlo. Nessuna cambia il registro (`collezioni` vuoto): aprire e
// chiudere sono lavoro del guscio, stella e oblio toccano un elenco in
// `userData`. Il lavoro sta in `src/actions/documents.ts`.
//
// Nessuna guardia sul percorso: la stella aggiunge quel che non c'è, e
// dimenticare lascia cadere quel che non trova.
//
// Elenco a mano: un file non nominato qui non si registra.

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

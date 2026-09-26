// I modelli dei fogli: leggerli e provarli. Sono del programma e non si
// cambiano da qui; la carta intestata sta nel documento (`intestazione.*`,
// `impostazioni.salva`). Sono letture: il lavoro sta in
// `src/actions/templates.ts`, in due funzioni esportate per le procedure.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as leggi } from './leggi.js'
import { procedura as prova } from './prova.js'

export const procedureModelli: ProceduraQualunque[] = [
  leggi,
  prova,
]

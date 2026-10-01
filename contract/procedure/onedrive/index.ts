// Le procedure di `onedrive`: sfogliare, cercare i documenti `.regi`, aprirne
// uno. Leggono a nome di un account di `microsoft.aggiungi`.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '#contract/contract.js'
import { procedura as apri } from './apri.js'
import { procedura as cerca } from './cerca.js'
import { procedura as elenco } from './elenco.js'

export const procedureOnedrive: ProceduraQualunque[] = [
  apri,
  cerca,
  elenco,
]

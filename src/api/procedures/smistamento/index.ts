// Lo smistamento: il PDF che arriva e le pagine che restano da decidere. Molto
// di quel che fa esce dall'archivio (quarantena, ritagli nel lettore, cestino,
// coda OCR). Ogni procedura passa il lavoro al gestore in
// `src/actions/sorting.ts`.
//
// Gli schemi sono larghi apposta: controllano la forma, mentre il merito lo
// giudicano i gestori, con frasi migliori di «ingresso non valido».
//
// Elenco a mano: un file non nominato qui non si registra.

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

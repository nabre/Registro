// Le consegne: darle, spuntarle, raccoglierle, spedirle, e i file appesi (firme
// di ritiro, documento del singolo). Un id sbagliato qui manda un documento
// alla famiglia sbagliata, e alcune chiamate hanno effetti fuori dal registro
// (`consegne.distribuisci` manda e-mail, `consegne.raccogli` copia file):
// per questo `idempotente: false` compare spesso.
//
// Il lavoro resta nei gestori di `src/actions/assignments.ts`; qui forma
// dell'ingresso, guardia sull'esistenza e codice d'errore.
//
// Elenco a mano: un file non nominato qui non si registra.

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

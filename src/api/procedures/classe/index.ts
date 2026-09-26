// Il mestiere del docente di classe: recapiti, comunicazioni alle famiglie,
// fogli delle assenze da far firmare.
//
// `nelFascicolo` crea il fascicolo che manca ma, se la classe non esiste, non
// scrive niente e risponde «fatto»: per questo qui le guardie sugli id danno
// `non-trovato`. Il lavoro resta nei gestori di `src/actions/classTeacher.ts`.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as persone } from './persone.js'
import { procedureClasseAssenze } from './assenze/index.js'
import { procedureClasseComunicazioni } from './comunicazioni/index.js'
import { procedureClasseRecapiti } from './recapiti/index.js'

export const procedureClasse: ProceduraQualunque[] = [
  ...procedureClasseAssenze,
  ...procedureClasseComunicazioni,
  ...procedureClasseRecapiti,
  persone,
]

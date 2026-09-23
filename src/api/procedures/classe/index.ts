// Il mestiere del docente di classe: recapiti, comunicazioni alle famiglie,
// fogli delle assenze da far firmare.
//
// È l'area in cui il contratto aggiunge di più, perché è quella in cui un id
// sbagliato non si vedeva. `nelFascicolo` crea il fascicolo che manca, ma se la
// classe non esiste non scrive niente e risponde «fatto» lo stesso: chi chiama
// da fuori con un `classeId` storto riceveva un sì per qualcosa che non è
// successo. Qui quel caso diventa «Classe non trovata.», con il codice
// `non-trovato` che lo distingue da un rifiuto di validazione.
//
// Il lavoro non si è spostato di una riga: ogni procedura passa la palla al
// gestore di sempre in `src/actions/classTeacher.ts`. Qui ci sono la forma
// dell'ingresso, le guardie sugli id e il codice d'errore giusto.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

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

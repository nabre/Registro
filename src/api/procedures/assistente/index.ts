// Stacca l'assistente in una finestra sua.
//
// Una procedura che non scrive niente — apre una finestra — dichiarata
// `scrittura` come quelle della proiezione, e per la stessa ragione:
// il `genere` non dice se il file cambia, dice se chi chiama da fuori può
// farlo senza il permesso di scrivere. Una riga di comando che aprisse finestre
// sulla macchina di chi insegna è esattamente quel che la sola lettura non deve
// concedere — **e con lei il modello dell'assistente**, che vede solo le
// letture e quindi non può staccarsi da sé.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as contesto } from './contesto.js'
import { procedura as stacca } from './stacca.js'

export const procedureAssistente: ProceduraQualunque[] = [
  contesto,
  stacca,
]

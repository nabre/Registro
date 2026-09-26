// Stacca l'assistente in una finestra sua. Non scrive niente ma è `scrittura`,
// come la proiezione: il `genere` dice se serve il permesso di scrivere, e aprire
// finestre sulla macchina di chi insegna non va concesso alla sola lettura né al
// modello dell'assistente.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as contesto } from './contesto.js'
import { procedura as stacca } from './stacca.js'

export const procedureAssistente: ProceduraQualunque[] = [
  contesto,
  stacca,
]

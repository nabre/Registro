// Quel che le procedure di `esportazioni` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { esportazioniPresenti } from '../../../data/filing.js'
import { ESPORTAZIONI } from '../../../domain/locations.js'
import { CARTE } from '../../../domain/lexicon.js'
import { errore } from '../../contract.js'

/**
 * Quel documento sta davvero nella cartella delle esportazioni.
 *
 * Il controllo si ferma sulla soglia: un percorso che non comincia per
 * `esportazioni/` non lo si dichiara «non trovato», perché non è quello il
 * problema — lo è che punta altrove, e quella frase la dice il gestore, che la
 * dice meglio. Qui si risponde a una domanda sola: fra le esportazioni, quel
 * foglio c'è ancora?
 */
export function esigiDocumento (percorso: string): void {
  if (!percorso.startsWith(`${ESPORTAZIONI}/`)) return
  if (!esportazioniPresenti().some((voce) => voce.percorso === percorso)) {
    throw errore.nonTrovato(CARTE.documento)
  }
}

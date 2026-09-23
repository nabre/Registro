// Quel che le procedure di `composizioni` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { composizioniPresenti } from '../../../data/compositions.js'
import { CARTE } from '../../../domain/lexicon.js'
import { errore } from '../../contract.js'

/**
 * Quella composizione c'è ancora.
 *
 * Il termine è `CARTE.documento` e non `CARTE.fascicolo`: nel lessico
 * «fascicolo» vuol dire *fascicolo di classe* — il rapporto, un'altra cosa —
 * e per la composizione un termine non c'è. Meglio la parola vera e più
 * generica che una parola precisa e sbagliata.
 */
export function esigiComposizione (id: string): void {
  if (!composizioniPresenti().some((c) => c.id === id)) {
    throw errore.nonTrovato(CARTE.documento)
  }
}

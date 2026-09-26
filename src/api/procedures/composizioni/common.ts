// Guardie delle procedure di `composizioni`.

import { composizioniPresenti } from '../../../data/compositions.js'
import { errore } from '../../contract.js'

/**
 * Quella composizione c'è ancora. Il termine è `documento`: nel lessico
 * «fascicolo» è il fascicolo di classe, e per la composizione un termine non
 * c'è.
 */
export function esigiComposizione (id: string): void {
  if (!composizioniPresenti().some((c) => c.id === id)) {
    throw errore.nonTrovato('documento')
  }
}

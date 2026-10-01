// Guardie delle procedure di `esportazioni`.

import { esportazioniPresenti } from '#core/dati/filing.js'
import { ESPORTAZIONI } from '#core/dominio/locations.js'
import { errore } from '#contract/contract.js'

/**
 * Quel foglio c'è ancora fra le esportazioni. Un percorso fuori da
 * `esportazioni/` non è «non trovato»: lo rifiuta il gestore, con la sua frase.
 */
export function esigiDocumento (percorso: string): void {
  if (!percorso.startsWith(`${ESPORTAZIONI}/`)) return
  if (!esportazioniPresenti().some((voce) => voce.percorso === percorso)) {
    throw errore.nonTrovato('documento')
  }
}

// Pezzi di schema delle procedure di `esporta`.

import { identificatore, nullabile, type Schema } from '../../schemas.js'
import { testi } from './esporta.testi.js'

/**
 * Il semestre di un'esportazione, o `null` per l'anno intero (il gestore ne
 * ricava l'etichetta del periodo). Nessuna guardia: un semestre che non si
 * trova vale l'anno intero.
 */
export function semestreDiEsportazione (): Schema<string | null> {
  return nullabile(identificatore({ aiuto: () => testi().comune.semestre }))
}

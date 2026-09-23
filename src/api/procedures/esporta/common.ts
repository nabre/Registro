// Quel che le procedure di `esporta` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { SCUOLA } from '../../../domain/lexicon.js'
import { errore, type Ambito } from '../../contract.js'
import { identificatore, nullabile, type Schema } from '../../schemas.js'

/** Il corso, o il motivo per cui non c'è. */
export function esigiCorso (ambito: Ambito, corsoId: string) {
  const corso = ambito.contesto.registro.corsi.find((c) => c.id === corsoId)
  if (!corso) throw errore.nonTrovato(SCUOLA.corso)
  return corso
}

/**
 * Il semestre di un'esportazione: uno dei suoi, oppure `null`.
 *
 * `null` non è «manca», è «l'anno intero»: il gestore ci conta sopra per
 * scegliere l'etichetta del periodo, e i due significati non coincidono mai
 * per caso. Un semestre che non si trova non è un errore — vale l'anno intero
 * — e quindi qui non c'è una guardia: metterla renderebbe illeggibile un id
 * vecchio in un pulsante che oggi funziona.
 */
export function semestreDiEsportazione (): Schema<string | null> {
  return nullabile(identificatore({ aiuto: 'Il semestre da esportare; null è l’anno intero' }))
}

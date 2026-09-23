// Quel che le procedure di `persone` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { PERSONE } from '../../../domain/lexicon.js'
import { errore, type Ambito } from '../../contract.js'
import { esigiClasse } from '../common/register.js'

/**
 * La classe c'è, e quella persona è dentro.
 *
 * Due «non trovato» e non uno: il gestore della foto rispondeva la stessa
 * frase — «persona in formazione non trovata» — tanto per la classe sparita
 * quanto per la persona, e chi chiama da fuori non poteva distinguere una
 * classe eliminata da un'altra finestra da un identificativo copiato male.
 */
export function esigiPersona (ambito: Ambito, classeId: string, allievoId: string): void {
  const classe = esigiClasse(ambito, classeId)
  if (!classe.allievi.some((a) => a.id === allievoId)) throw errore.nonTrovato(PERSONE.pif)
}

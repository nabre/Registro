// Quel che le procedure di `persone` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { errore, type Ambito } from '../../contract.js'
import { esigiClasse } from '../common/register.js'

/**
 * La classe c'è e quella persona è dentro. Due «non trovato» distinti: classe
 * sparita o identificativo sbagliato.
 */
export function esigiPersona (ambito: Ambito, classeId: string, allievoId: string): void {
  const classe = esigiClasse(ambito, classeId)
  if (!classe.allievi.some((a) => a.id === allievoId)) throw errore.nonTrovato('pif')
}

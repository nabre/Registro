// Quel che le procedure di `documento` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { testo, type Schema } from '../../schemas.js'

/**
 * Il percorso di un documento d'anno sul disco.
 *
 * Testo e basta, largo: è un percorso del sistema operativo — lettere di
 * unità, UNC, cartelle sincronizzate con nomi che nessuna espressione regolare
 * scritta qui indovinerebbe — e l'unico che lo sa leggere davvero è il
 * sistema. `stessoFile` in `environment/documents.ts` è quel che decide se due
 * scritture diverse sono lo stesso file.
 */
export function percorsoDocumento (): Schema<string> {
  return testo({
    minimo: 1,
    massimo: 4096,
    aiuto: 'Il percorso del documento d’anno sul disco',
    esempio: 'C:\\Users\\docente\\Documenti\\2025-2026.registro',
  })
}

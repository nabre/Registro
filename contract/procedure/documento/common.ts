// Pezzi di schema delle procedure di `documento`.

import { testo, type Schema } from '../../schemas.js'
import { testi } from './documento.testi.js'

/**
 * Il percorso di un documento d'anno, come testo largo: lettere di unità, UNC,
 * cartelle sincronizzate. Se due percorsi sono lo stesso file lo decide
 * `stessoFile` in `environment/documents.ts`.
 */
export function percorsoDocumento (): Schema<string> {
  return testo({
    minimo: 1,
    massimo: 4096,
    aiuto: () => testi().comune.percorso,
    esempio: 'C:\\Users\\docente\\Documenti\\2025-2026.regi',
  })
}

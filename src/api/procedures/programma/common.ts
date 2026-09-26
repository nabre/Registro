// Pezzi di schema delle procedure di `programma`.

import { testo, type Schema } from '../../schemas.js'
import { testi } from './programma.testi.js'

/**
 * La forma di una chiave del programma: `registroDocenti.vassoio.attivo`.
 * Tiene fuori quel che non è nemmeno una chiave nostra (un'altra app, un
 * percorso). La dogana vera è `valoreConMotivo` in `environment/settings.ts`,
 * accanto al manifesto.
 */
const CHIAVE_PROGRAMMA = /^registroDocenti\.[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/

export function chiaveProgramma (): Schema<string> {
  return testo({
    minimo: 16,
    massimo: 120,
    modello: CHIAVE_PROGRAMMA,
    esempio: 'registroDocenti.vassoio.attivo',
    aiuto: () => testi().comune.chiave,
  })
}

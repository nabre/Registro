// Guardie delle procedure di `risorse`.

import type { PianoLezione } from '../../../domain/models.js'
import { errore } from '../../contract.js'

/**
 * La tappa della scaletta, quando se ne nomina una. `attivitaId` nullo vuol dire
 * «del piano nel suo insieme»; solo un id che non c'è è «non trovato».
 */
export function esigiTappa (piano: PianoLezione, attivitaId: string | null): void {
  if (!attivitaId) return
  if (!piano.attivita.some((a) => a.id === attivitaId)) {
    throw errore.nonTrovato('attivita')
  }
}

/** La risorsa dove si è detto che sta: nel piano, o appesa a una sua tappa. */
export function esigiRisorsa (
  piano: PianoLezione,
  attivitaId: string | null,
  risorsaId: string,
): void {
  const risorse = attivitaId
    ? piano.attivita.find((a) => a.id === attivitaId)?.risorse ?? []
    : piano.risorse
  if (!risorse.some((r) => r.id === risorsaId)) throw errore.nonTrovato('risorsa')
}

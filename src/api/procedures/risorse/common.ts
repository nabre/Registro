// Quel che le procedure di `risorse` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { LEZIONE } from '../../../domain/lexicon.js'
import type { PianoLezione } from '../../../domain/models.js'
import { errore } from '../../contract.js'

/**
 * La tappa della scaletta, quando se ne nomina una.
 *
 * `attivitaId` nullo non è un id mancante: vuol dire «del piano nel suo
 * insieme», ed è il caso normale. Solo un id valorizzato che nella scaletta
 * non c'è è un «non trovato».
 */
export function esigiTappa (piano: PianoLezione, attivitaId: string | null): void {
  if (!attivitaId) return
  if (!piano.attivita.some((a) => a.id === attivitaId)) {
    throw errore.nonTrovato(LEZIONE.attivita)
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
  if (!risorse.some((r) => r.id === risorsaId)) throw errore.nonTrovato(LEZIONE.risorsa)
}

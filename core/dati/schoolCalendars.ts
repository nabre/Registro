// Registro dei calendari scolastici ufficiali dei cantoni.
//
// Attualmente include il Cantone Ticino come predefinito e fornisce
// le funzioni per selezionare o registrare i calendari ufficiali di altri cantoni.

import type { CalendarioUfficiale } from '../dominio/schoolCalendar.js'
import { CALENDARIO_TICINO } from './schoolCalendarTicino.js'

/** L'elenco dei calendari scolastici ufficiali integrati nel registro. */
export const CALENDARI_UFFICIALI: readonly CalendarioUfficiale[] = [
  CALENDARIO_TICINO,
]

/**
 * Restituisce il calendario ufficiale per il cantone richiesto ('TI', 'Ticino', ecc.),
 * oppure il calendario predefinito (Ticino) se il cantone non è presente.
 */
export function calendarioUfficialePerCantone (cantone?: string): CalendarioUfficiale {
  if (!cantone) return CALENDARIO_TICINO
  const cercato = cantone.trim().toLowerCase()
  const trovato = CALENDARI_UFFICIALI.find(
    (c) => c.cantone.toLowerCase() === cercato || c.cantoneNome.toLowerCase() === cercato,
  )
  return trovato ?? CALENDARIO_TICINO
}

/**
 * Restituisce l'elenco dei cantoni che dispongono di un calendario ufficiale integrato.
 */
export function cantoniUfficialiDisponibili (): Array<{ cantone: string, cantoneNome: string }> {
  return CALENDARI_UFFICIALI.map((c) => ({ cantone: c.cantone, cantoneNome: c.cantoneNome }))
}

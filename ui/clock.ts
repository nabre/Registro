// Il minuto che passa, senza ridisegnare il pannello.
//
// Un ridisegno completo al minuto rifaceva tutta la vista (e nel calendario,
// fitto, si vedeva). Di quel che si guarda, a ogni minuto cambia solo quel che
// segna l'ora: la riga di adesso nella settimana. Chi la disegna si iscrive qui
// e si sposta da sé; il resto (un'ora che smette di essere «in corso») si
// rimette al primo ridisegno che arriva per altre ragioni, o al giorno nuovo.

import type { Ora } from '#core/dominio/models.js'

type AlMinuto = (ora: Ora) => void

const iscritti = new Set<AlMinuto>()

/** Chiama `fn` a ogni minuto nuovo dello stesso giorno. Torna la disiscrizione. */
export function alMinuto (fn: AlMinuto): () => void {
  iscritti.add(fn)
  return () => { iscritti.delete(fn) }
}

/** Il minuto è cambiato (non il giorno): avvisa chi segna l'ora. */
export function battiMinuto (ora: Ora): void {
  for (const fn of iscritti) fn(ora)
}

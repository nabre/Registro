// La lingua di adesso, una per processo: ognuno la imposta all'avvio con
// `impostaLingua` (il main dall'impostazione, le pagine dal preload).
//
// Un testo si chiede quando serve, mai a livello di modulo: una costante in cima
// a un file si calcola prima che la lingua sia scelta. `npm run i18n` le cerca.
// Senza scelta vale l'italiano, ed è quel che vedono le prove.

import { LINGUA_PREDEFINITA, LOCALI, type Lingua } from './languages.js'

let corrente: Lingua = LINGUA_PREDEFINITA

const ascoltatori = new Set<(lingua: Lingua) => void>()

/** La lingua in cui il processo parla adesso. */
export function lingua (): Lingua {
  return corrente
}

/** L'etichetta BCP 47 da dare a `Intl` e a `toLocale*`: `it-CH`, `de-CH`… */
export function locale (): string {
  return LOCALI[corrente]
}

/**
 * Cambia la lingua del processo e avvisa chi ascolta (menu, icona di sistema):
 * le pagine invece si ricaricano.
 */
export function impostaLingua (nuova: Lingua): void {
  if (nuova === corrente) return
  corrente = nuova
  for (const ascoltatore of [...ascoltatori]) ascoltatore(nuova)
}

/** Ascolta i cambi di lingua. Torna la funzione che smette di ascoltare. */
export function alCambioLingua (ascoltatore: (lingua: Lingua) => void): () => void {
  ascoltatori.add(ascoltatore)
  return () => {
    ascoltatori.delete(ascoltatore)
  }
}

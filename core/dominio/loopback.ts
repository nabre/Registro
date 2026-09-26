// Un indirizzo di questo computer, e nessun altro.
//
// La dettatura manda la voce a un indirizzo scritto in un JSON riscrivibile da
// altri programmi (`data/voicebox.ts`): un indirizzo esterno farebbe uscire la
// voce, cognomi compresi. Regola stretta: `http`, host `127.0.0.1`, `localhost`
// o `[::1]`, niente credenziali né percorso.
//
// Sta nel dominio perché la usano sia la dogana delle impostazioni
// (`environment/settings.ts`) sia la dettatura a ogni rilettura: una regola sola.

import { testi } from './loopback.testi.js'

/** I nomi che vogliono dire «questo computer». Come li scrive `URL`, parentesi comprese. */
const NOMI_LOCALI: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '[::1]'])

/**
 * Perché quel che è scritto non è un indirizzo di questo computer, o `null`
 * se lo è. Frase finita: la mostrano le due superfici delle impostazioni.
 */
export function perchéNonLocale (scritto: string): string | null {
  const t = testi()
  const pulito = scritto.trim()
  if (pulito === '') return t.vuoto
  let letto: URL
  try {
    letto = new URL(pulito)
  } catch {
    return t.nonIndirizzo
  }
  if (letto.protocol !== 'http:') return t.soloHttp
  if (!NOMI_LOCALI.has(letto.hostname.toLowerCase())) return t.nonLocale
  if (letto.username !== '' || letto.password !== '') return t.credenziali
  if (letto.pathname !== '/' || letto.search !== '' || letto.hash !== '') return t.percorso
  return null
}

/**
 * L'origine scritta senza barra finale (`http://127.0.0.1:17493`) se è di
 * questo computer, altrimenti vuota: niente eccezione, chi chiama spiega perché.
 */
export function indirizzoLocale (scritto: string): string {
  return perchéNonLocale(scritto) === null ? new URL(scritto.trim()).origin : ''
}

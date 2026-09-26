// La dettatura con lo shim delle impostazioni, in un grafo solo (come
// `llm.ts`). Anche `fermaDettature`: il segnale è una variabile di modulo di
// `voicebox.ts`.

export {
  collegamentoDettatura,
  dettaturaAccesa,
  fermaDettature,
  prontezzaDettatura,
  ritiraCorredoWhisper,
  trascrivi,
} from '../../core/dati/dictation.js'
export { VOICEBOX, ripulisci, wav } from '../../core/dati/voicebox.js'
export { indirizzoLocale, perchéNonLocale } from '../../core/dominio/loopback.js'
export { ricaricaImpostazioni } from '../../desktop/apparato/settings.js'

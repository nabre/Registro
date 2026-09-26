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
} from '../../src/data/dictation.js'
export { VOICEBOX, ripulisci, wav } from '../../src/data/voicebox.js'
export { indirizzoLocale, perchéNonLocale } from '../../src/domain/loopback.js'
export { ricaricaImpostazioni } from '../../src/environment/settings.js'

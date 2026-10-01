// Il livello LLM con lo shim delle impostazioni, in un grafo solo (come
// `api.ts` e `data.ts`): le impostazioni dello shim sono una variabile di
// modulo, e con due bundle i valori scritti sparirebbero lasciando i
// predefiniti.

export { collegamento, prontezza, genera, chatta } from '#core/dati/llm.js'
export {
  cartellaModelli,
  elimina,
  importaInDisparte,
  modelliLocali,
  modelloNellaCartella,
  perchéNonEntra,
  scarica,
  segnaSorgente,
  sorgenteDi,
} from '#core/dati/gguf.js'
export { argomenti, ripulisci, programmaDa } from '#core/dati/mtmd.js'
// Il corredo delle scansioni, che `mtmd.ts` interroga a ogni lettura.
export { cartellaCorredo, siScarica } from '#core/dati/visionKit.js'
export { perGriglia } from '#core/dati/llamaCpp.js'
export { ricaricaImpostazioni } from '#desktop/apparato/platform.js'

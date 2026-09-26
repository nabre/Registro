// Il livello LLM con lo shim delle impostazioni, in un grafo solo (come
// `api.ts` e `data.ts`): le impostazioni dello shim sono una variabile di
// modulo, e con due bundle i valori scritti sparirebbero lasciando i
// predefiniti.

export { collegamento, prontezza, genera, chatta } from '../../src/data/llm.js'
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
} from '../../src/data/gguf.js'
export { argomenti, ripulisci, programmaDa } from '../../src/data/mtmd.js'
// Il corredo delle scansioni, che `mtmd.ts` interroga a ogni lettura.
export { cartellaCorredo, siScarica } from '../../src/data/visionKit.js'
export { perGriglia } from '../../src/data/llamaCpp.js'
export { ricaricaImpostazioni } from '../../src/environment/settings.js'

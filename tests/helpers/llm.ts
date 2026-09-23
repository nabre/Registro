// Il livello LLM con sotto lo shim delle impostazioni, in un grafo solo.
//
// Stessa ragione di `tests/helpers/api.ts` e di `tests/helpers/data.ts`: le
// impostazioni lette dallo shim stanno in una variabile di modulo, e con due
// bundle una prova che *scrive* il file da uno e legge un collegamento
// dall'altro sta guardando due tabelle che non si conoscono — con il risultato
// che i predefiniti tornano giusti e i valori scritti spariscono, cioè il modo
// più ingannevole in cui una prova possa passare a metà.

export { collegamento, prontezza, genera, chatta, conMotivo } from '../../src/data/llm.js'
export {
  cartellaModelli,
  // Il biglietto che dice da dove veniva uno scarico a metà: è quel che rende
  // possibile «Riprendi», e quel che deve sparire quando i pesi spariscono.
  dimenticaSorgente,
  elimina,
  importa,
  modelliLocali,
  modelloNellaCartella,
  perchéNonEntra,
  scarica,
  segnaSorgente,
  sorgenteDi,
} from '../../src/data/gguf.js'
export { argomenti, ripulisci, programmaDa, programmaValido } from '../../src/data/mtmd.js'
// Il corredo delle scansioni entra nello stesso grafo perché `mtmd.ts` lo
// interroga a ogni lettura: provarlo da un bundle suo vorrebbe dire due
// cartelle e due tabelle di impostazioni che non si conoscono.
export { cartellaCorredo, siScarica } from '../../src/data/visionKit.js'
export { perGriglia } from '../../src/data/llamaCpp.js'
export { ricaricaImpostazioni } from '../../src/environment/settings.js'

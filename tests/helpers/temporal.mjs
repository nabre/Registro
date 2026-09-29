// `Temporal` per i bundle di prova (ADR-50, passo 4). Electron 44 lo ha nativo,
// nel processo principale e nella pagina; il Node delle prove no.
//
// esbuild lo inietta (`inject` in `esbuild.mjs`, solo con `--test` e `--ui`):
// ogni `Temporal` libero nei bundle di prova diventa questo import, e il
// bundle dell'applicazione non ne sa niente. Niente `globalThis`: un Node che un
// giorno lo avesse nativo non cambierebbe le prove sotto i piedi.

export { Temporal } from 'temporal-polyfill'

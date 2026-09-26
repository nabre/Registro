// Lo strato dei dati in un grafo solo, come in `principale.cjs`: l'anno in uso
// (`paths.ts`) e il deposito aperto (`store.ts`) sono variabili di modulo, e
// con bundle separati ogni bundle ne avrebbe una copia, cioè due registri che
// non si conoscono.

export { Archivio } from '../../src/data/archive.js'
export { impacchettaAnni, inglobaCartelle, migraAnni } from '../../src/data/years.js'
export { deposito, percorsoVero, registraDeposito } from '../../src/data/store.js'
export { Pacchetto } from '../../src/data/package.js'
export { archivia, archiviPresenti, migraArchivio, riscrivi } from '../../src/data/filing.js'
// I fascicoli composti: si creano e si buttano passando dal deposito.
export { composizioni } from '../../src/actions/compositions.js'
// Lo smistamento: un PDF si posa nel deposito e la sua riga nell'archivio. Il
// worker di pdfjs lo dichiara la prova, come l'avvio.
export { smistamento } from '../../src/actions/sorting.js'
export { impostaCaratteri, impostaWorker } from '../../src/data/pdf.js'
export { smistatoreDi } from '../../src/data/sorter.js'
export { esportazioni } from '../../src/actions/exports.js'
export { ricettePresenti } from '../../src/data/compositions.js'
export { Uri } from '../../src/environment/uri.js'
export { firmaPosta } from '../../src/data/templates.js'

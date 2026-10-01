// Lo strato dei dati in un grafo solo, come in `principale.cjs`: l'anno in uso
// (`paths.ts`) e il deposito aperto (`store.ts`) sono variabili di modulo, e
// con bundle separati ogni bundle ne avrebbe una copia, cioè due registri che
// non si conoscono.

export { Archivio } from '../../core/dati/archive.js'
export { impacchettaAnni, inglobaCartelle, migraAnni } from '../../core/dati/years.js'
export { deposito, percorsoVero, registraDeposito } from '../../core/dati/store.js'
export { DATI, Pacchetto } from '../../core/dati/package.js'
export { archivia, archiviaCopia, archiviPresenti, migraArchivio, pulisciCopiaOrfana, riscrivi } from '../../core/dati/filing.js'
// I fascicoli composti: si creano e si buttano passando dal deposito.
// Lo smistamento: un PDF si posa nel deposito e la sua riga nell'archivio. Il
// worker di pdfjs lo dichiara la prova, come l'avvio.
export { smistamento } from '../../core/azioni/sorting.js'
export { impostaCaratteri, impostaWorker } from '../../core/dati/pdf.js'
export { smistatoreDi } from '../../core/dati/sorter.js'
export { esportazioni } from '../../core/azioni/exports.js'
export { Uri } from '../../core/apparato/uri.js'
export { firmaPosta } from '../../core/dati/templates.js'

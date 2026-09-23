// Lo strato dei dati in un pezzo solo, per le prove che lo esercitano insieme.
//
// Serve perché lo stato non è tutto dentro le classi: l'anno in uso sta in
// `paths.ts`, il deposito aperto in `store.ts`, e sono due variabili di
// modulo. Bundlati a parte — un file per `archive.ts`, un altro per `years.ts` —
// ogni bundle si porta la propria copia di quelle variabili, e una prova che
// carica il registro da uno e trasloca le cartelle con l'altro sta guardando due
// registri che non si conoscono. È successo, e il trasloco è risultato «zero
// file spostati» senza che niente fosse rotto davvero.
//
// Da qui esce un grafo solo, come nell'applicazione vera, dove tutto finisce in
// `principale.cjs`.

export { Archivio } from '../../src/data/archive.js'
export { impacchettaAnni, inglobaCartelle, migraAnni } from '../../src/data/years.js'
export {
  Deposito,
  contenutoDi,
  deposito,
  percorsoVero,
  registraDeposito,
} from '../../src/data/store.js'
export { ESTENSIONE, Pacchetto } from '../../src/data/package.js'
export { cartellaAnno, cartellaDocumento } from '../../src/data/paths.js'
export {
  archivia,
  archiviPresenti,
  migraArchivio,
  percorsoArchivio,
  riscrivi,
} from '../../src/data/filing.js'
// I fascicoli composti: le azioni e le ricette. Stanno qui e non in un bundle
// loro per la stessa ragione di tutto il resto — un fascicolo si crea e si
// butta via passando dal deposito, e con due grafi sarebbero due depositi.
export { composizioni } from '../../src/actions/compositions.js'
// Lo smistamento, per la stessa ragione: un PDF che entra si posa nel deposito
// e la sua riga finisce nell'archivio, e con due grafi sarebbero due depositi e
// due registri. Il worker di pdfjs si dichiara dalla prova, come fa l'avvio.
export { smistamento } from '../../src/actions/sorting.js'
export { impostaCaratteri, impostaWorker } from '../../src/data/pdf.js'
export { smistatoreDi } from '../../src/data/sorter.js'
export { esportazioni } from '../../src/actions/exports.js'
export { composizioniPresenti, ricettePresenti } from '../../src/data/compositions.js'
export { Uri } from '../../src/environment/uri.js'

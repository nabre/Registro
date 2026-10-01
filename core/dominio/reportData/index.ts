// Che cosa il registro mette dentro un modello di rapporto: valori, elenchi,
// tabelle. Nel dominio perché è una domanda sul registro; l'impaginazione la
// decide il modello e la disegna `data/reportsPdf.ts`. Un file per famiglia di
// rapporti; gli aiuti in comune stanno in `common.ts` e non escono di qui.

// `valoriComuni`: per le prove o l'accesso diretto ai valori comuni dell'intestazione.
export { CHIAVE_CARTA, colonne, legenda, comuni as valoriComuni } from './common.js'
export { datiDiario, datiLezione, datiPiano } from './lesson.js'
export { datiMomento, datiValutazioni } from './assessments.js'
export { datiFascicolo, datiFotoClasse, datiPresenze } from './classes.js'
export { datiAllievo } from './student.js'
export { datiCorso, datiSupplenze } from './course.js'

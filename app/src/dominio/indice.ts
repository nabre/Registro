// Punto d'ingresso unico del dominio: quello che importano l'extension host, il
// webview e i test. Il dominio non conosce né `vscode` né il DOM, ed è per
// questo che `node --test` lo può eseguire così com'è.

export * from './modelli.js'
// Il lessico esce come spazio di nomi e non a nomi sciolti: le sue scorciatoie
// si chiamano `il`, `i`, `un`, `del`, e a nomi così corti sparsi nel barile
// prima o poi qualcuno ne aggiunge uno uguale. Chi importa dal dominio scrive
// `lessico.corto(lessico.PIF)`; chi sta dentro l'applicazione importa il file
// e li usa nudi, dove il contesto li spiega.
export * as lessico from './lessico.js'
export * from './testo.js'
export * from './csv.js'
export * from './identificatori.js'
export * from './date.js'
export * from './anni.js'
export * from './calcoli.js'
export * from './fabbriche.js'
export * from './comunicazioni.js'
export * from './casella.js'
export * from './importazione.js'
export * from './corsi.js'
export * from './automazione.js'
export * from './orario.js'
export * from './validazione.js'
export * from './riparazioni.js'
export * from './eliminazioni.js'
export * from './cruscotto.js'
export * from './promemoria.js'
export * from './vassoio.js'
export * from './todo.js'
export * from './attivita.js'
export * from './consegne.js'
export * from './assenze.js'
export * from './smistamento.js'
export * from './matriceCorso.js'
export * from './orfani.js'
export * from './recuperi.js'
export * from './riconsegne.js'
export * from './rapporti.js'
export * from './datiRapporti.js'
export * from './proiezione.js'

// Tutte le finestre di creazione e modifica del registro, raccolte per area.
//
// Il file unico da quattromila righe è diventato una cartella: ogni area sta
// per conto suo — l'ora, la classe, il piano, la valutazione — e questo indice
// resta il solo posto da cui le si importa, così chi le usa non deve sapere
// in quale file sono finite.
//
// Ognuna segue lo stesso giro: si apre la modale, si compila, si manda
// l'azione, e se l'host risponde con degli errori questi tornano in cima al
// modulo senza chiuderlo — quello che si era scritto resta dov'è.

export { moduloAnno, moduloPause } from './moduli/anno.js'
export { moduloBloccoAssenze, moduloImportaAssenze } from './moduli/assenze.js'
export { moduloAllievo, moduloClasse, moduloImportaAllievi } from './moduli/classe.js'
export { chiediEliminazione } from './moduli/comune.js'
export { type OpzioniModuloConsegna, moduloConsegna } from './moduli/consegna.js'
export { type OpzioniModuloCorso, moduloAvvio, moduloCorso } from './moduli/corso.js'
export { moduloComunicazione, moduloRecapito } from './moduli/docenteClasse.js'
export { type OpzioniModuloLezione, moduloLezione, moduloOsservazione } from './moduli/lezione.js'
export { moduloMateria, moduloUnisciMaterie } from './moduli/materia.js'
export { moduloAssegnaPiano, moduloPiano } from './moduli/piano.js'
export { moduloRecupero } from './moduli/recupero.js'
export { bloccoRisorse, moduloCollegamento, moduloRisorsa } from './moduli/risorse.js'
export { moduloValutazione } from './moduli/valutazione.js'

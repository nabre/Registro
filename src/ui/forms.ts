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

export { moduloAnno, moduloPause } from './forms/year.js'
export { moduloBloccoAssenze, moduloImportaAssenze } from './forms/absences.js'
export { moduloAllievo, moduloClasse, moduloImportaAllievi } from './forms/class.js'
export { chiediEliminazione } from './forms/common.js'
export { moduloComposizione } from './forms/composition.js'
export { type OpzioniModuloConsegna, moduloConsegna } from './forms/assignment.js'
export { moduloAvvio } from './forms/startup.js'
export { type OpzioniModuloCorso, moduloCorso } from './forms/course.js'
export { moduloComunicazione, moduloRecapito } from './forms/classTeacher.js'
export { type OpzioniModuloLezione, moduloLezione, moduloOsservazione } from './forms/lesson.js'
export { moduloMateria, moduloUnisciMaterie } from './forms/subject.js'
export { type EditorPiano, editorPiano, moduloAssegnaPiano, moduloPiano } from './forms/plan.js'
export { moduloRecupero } from './forms/retake.js'
export { moduloValutazione } from './forms/assessment.js'

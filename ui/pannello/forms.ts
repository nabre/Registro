// Indice delle finestre di creazione e modifica, divise per area in `forms/`:
// è il solo posto da cui le si importa. Se l'host risponde con errori, tornano
// in cima al modulo senza chiuderlo.

export { moduloAnno, moduloPause } from './forms/year.js'
export { moduloBloccoAssenze, moduloImportaAssenze } from './forms/absences.js'
export { moduloCalendario } from './forms/calendar.js'
export { moduloColonnaCheck, moduloColonneCheck, moduloDataCheck } from './forms/check.js'
export {
  type OpzioniModuloEventoIcs,
  moduloEventoIcs,
  sincronizzaDaIcs,
} from './forms/icsEvent.js'
export { moduloAllievo, moduloClasse, moduloImportaAllievi, moduloNuovaPersona } from './forms/class.js'
export { chiediEliminazione } from './forms/common.js'
export { moduloComposizione } from './forms/composition.js'
export { type OpzioniModuloConsegna, moduloConsegna } from './forms/assignment.js'
export { type OpzioniModuloCorso, moduloCorso } from './forms/course.js'
export { moduloComunicazione, moduloRecapito } from './forms/classTeacher.js'
export { type OpzioniModuloLezione, moduloLezione, moduloOsservazione } from './forms/lesson.js'
export { moduloMateria, moduloUnisciMaterie } from './forms/subject.js'
export { type EditorPiano, editorPiano, moduloAssegnaPiano, moduloPiano } from './forms/plan.js'
export { moduloRecupero } from './forms/retake.js'
export { moduloImportaRegistro } from './forms/registerImport.js'
export { moduloValutazione } from './forms/assessment.js'

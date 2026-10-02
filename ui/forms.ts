// Indice delle finestre di creazione e modifica, divise per area in `forms/`:
// è il solo posto da cui le si importa. Se l'host risponde con errori, tornano
// in cima al modulo senza chiuderlo.

export { moduloAnno, moduloPause } from './forms/year.js'
export { moduloBloccoAssenze, moduloImportaAssenze } from './forms/absences.js'
export { moduloCalendario } from './forms/calendar.js'
export { moduloColonnaCheck, moduloColonneCheck, moduloDataCheck } from './forms/check.js'
export {
  moduloEventoIcs,
  sincronizzaDaIcs,
} from './forms/icsEvent.js'
export { moduloAllievo, moduloClasse, moduloImportaAllievi, moduloNuovaPersona } from './forms/class.js'
export { cestinoPer, chiediEliminazione } from './forms/common.js'
export { moduloConsegna } from './forms/assignment.js'
export { moduloCorso } from './forms/course.js'
export { moduloComunicazione, moduloRecapito } from './forms/classTeacher.js'
export { moduloLezione, moduloOsservazione } from './forms/lesson.js'
export { moduloMateria, moduloUnisciMaterie } from './forms/subject.js'
export { editorPiano, moduloAssegnaPiano } from './forms/plan.js'
export { moduloRecupero } from './forms/retake.js'
export { moduloImportaRegistro } from './forms/registerImport.js'
export { moduloValutazione } from './forms/assessment.js'
export { moduloSupplenza } from './forms/substitute.js'

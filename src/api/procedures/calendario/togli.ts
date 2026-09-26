import { calendario } from '../../../actions/calendar.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { testi } from './calendario.testi.js'

const t = () => testi().togli

/**
 * Toglie un calendario dal documento, con la sua copia.
 *
 * Le regole di abbinamento restano: sono di tutti i calendari. Le lezioni già
 * scritte non si toccano. Idempotente: togliere quel che non c'è è già fatto.
 */
export const procedura = scrittura({
  nome: 'calendario.togli',
  titolo: () => t().titolo,
  azione: 'calendario.togli',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({
    calendarioId: identificatore({ aiuto: () => t().calendarioId }),
  }),
  esegui: inoltra(calendario, 'calendario.togli'),
})

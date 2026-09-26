import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './stato.testi.js'

const t = () => testi().ricarica

/**
 * Rilegge tutto dal disco. `scrittura` anche se non scrive: dopo, il registro
 * in memoria non è più quello di prima. Nessuna raccolta si riscrive.
 */
export const procedura = scrittura({
  nome: 'stato.ricarica',
  titolo: () => t().titolo,
  azione: 'stato.ricarica',
  idempotente: true,
  ingresso: vuoto(),
  esegui: inoltra(registro, 'stato.ricarica'),
})

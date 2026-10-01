import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './stato.testi.js'

const t = () => testi().ricarica

/**
 * Rilegge tutto dal disco. `scrittura` anche se di solito non scrive: dopo, il
 * registro in memoria non è più quello di prima. Riscrive `registro` solo
 * portando dentro una vecchia `templates/`, come `stato.leggi`.
 */
export const procedura = scrittura({
  nome: 'stato.ricarica',
  titolo: () => t().titolo,
  azione: 'stato.ricarica',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: vuoto(),
  esegui: inoltra(registro, 'stato.ricarica'),
})

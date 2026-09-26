import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { vuoto } from '../../../schemas.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().lettura.impostazioni

/**
 * Apre le impostazioni della lettura automatica (dell'applicazione, perché
 * dicono se questa macchina ha un OCR). Non tocca registro né disco, ma resta
 * `scrittura` perché apre una finestra.
 */
export const procedura = scrittura({
  nome: 'smistamento.lettura.impostazioni',
  titolo: () => t().titolo,
  azione: 'smistamento.impostazioni',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(smistamento, 'smistamento.impostazioni'),
})

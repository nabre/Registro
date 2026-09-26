import { documenti } from '../../../actions/documents.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './stato.testi.js'

const t = () => testi().salva

export const procedura = scrittura({
  nome: 'stato.salva',
  titolo: () => t().titolo,
  azione: 'stato.salva',
  // La seconda volta non c'è più niente in attesa.
  idempotente: true,
  // Si scrive su disco quel che era già in memoria: il gestore torna `invariato`.
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(documenti, 'stato.salva'),
})

import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './posta.testi.js'

export const procedura = scrittura({
  nome: 'posta.collega',
  titolo: () => testi().collega.titolo,
  azione: 'posta.collega',
  // Ricollegare una casella già collegata lascia collegata la stessa casella.
  idempotente: true,
  // Il gettone va nel portachiavi del sistema, non nel registro; il gestore non
  // torna `invariato` perché la pastiglia «casella collegata» deve accendersi.
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'posta.collega'),
})

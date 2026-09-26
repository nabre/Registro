import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './posta.testi.js'

export const procedura = scrittura({
  nome: 'posta.prova',
  titolo: () => testi().prova.titolo,
  azione: 'posta.prova',
  // Si collega e chiude: si può ritentare.
  idempotente: true,
  // Il gestore torna `invariato`: il registro non cambia.
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'posta.prova'),
})

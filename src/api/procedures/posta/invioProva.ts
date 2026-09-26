import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './posta.testi.js'

export const procedura = scrittura({
  nome: 'posta.invioProva',
  titolo: () => testi().invioProva.titolo,
  azione: 'posta.invioProva',
  /**
   * Spedisce davvero: due chiamate sono due messaggi, e chi ritenta non sa se il
   * primo è partito. Il registro resta identico (`collezioni` vuoto).
   */
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'posta.invioProva'),
})

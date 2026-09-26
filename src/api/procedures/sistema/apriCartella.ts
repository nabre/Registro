import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './sistema.testi.js'

export const procedura = scrittura({
  nome: 'sistema.apriCartella',
  titolo: () => testi().apriCartella.titolo,
  azione: 'sistema.apriCartella',
  // Aprire due volte la stessa cartella mostra la stessa cartella.
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'sistema.apriCartella'),
})

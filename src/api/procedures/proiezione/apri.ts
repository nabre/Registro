import { proiezione } from '../../../actions/projection.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './proiezione.testi.js'

export const procedura = scrittura({
  nome: 'proiezione.apri',
  titolo: () => testi().apri.titolo,
  azione: 'proiezione.apri',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(proiezione, 'proiezione.apri'),
})

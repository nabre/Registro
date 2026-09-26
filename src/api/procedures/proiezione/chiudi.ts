import { proiezione } from '../../../actions/projection.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './proiezione.testi.js'

export const procedura = scrittura({
  nome: 'proiezione.chiudi',
  titolo: () => testi().chiudi.titolo,
  azione: 'proiezione.chiudi',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(proiezione, 'proiezione.chiudi'),
})

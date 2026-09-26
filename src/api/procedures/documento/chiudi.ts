import { documenti } from '../../../actions/documents.js'
import { inoltra, scrittura } from '../../core.js'
import { testi } from './documento.testi.js'
import { vuoto } from '../../schemas.js'

export const procedura = scrittura({
  nome: 'documento.chiudi',
  titolo: () => testi().chiudi.titolo,
  azione: 'documento.chiudi',
  idempotente: true,
  collezioni: [],
  documento: 'cambia',
  ingresso: vuoto(),
  esegui: inoltra(documenti, 'documento.chiudi'),
})

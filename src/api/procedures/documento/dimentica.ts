import { documenti } from '../../../actions/documents.js'
import { inoltra, scrittura } from '../../core.js'
import { testi } from './documento.testi.js'
import { oggetto } from '../../schemas.js'
import { percorsoDocumento } from './common.js'

export const procedura = scrittura({
  nome: 'documento.dimentica',
  titolo: () => testi().dimentica.titolo,
  azione: 'documento.dimentica',
  // La seconda volta non c'è più niente da togliere, e non è un errore.
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({ percorso: percorsoDocumento() }),
  esegui: inoltra(documenti, 'documento.dimentica'),
})

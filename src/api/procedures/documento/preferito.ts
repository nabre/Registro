import { documenti } from '../../../actions/documents.js'
import { inoltra, scrittura } from '../../core.js'
import { testi } from './documento.testi.js'
import { booleano, oggetto } from '../../schemas.js'
import { percorsoDocumento } from './common.js'

export const procedura = scrittura({
  nome: 'documento.preferito',
  titolo: () => testi().preferito.titolo,
  azione: 'documento.preferito',
  // Si dichiara il valore voluto, non un interruttore.
  idempotente: true,
  // L'elenco dei recenti sta in `userData`. Non torna `invariato` perché il
  // pannello deve ricevere l'elenco.
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    percorso: percorsoDocumento(),
    preferito: booleano({ aiuto: () => testi().preferito.preferito }),
  }),
  esegui: inoltra(documenti, 'documento.preferito'),
})

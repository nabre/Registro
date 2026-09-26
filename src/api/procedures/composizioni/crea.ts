import { composizioni } from '../../../actions/compositions.js'
import { inoltra, scrittura } from '../../core.js'
import { elenco, oggetto, testo } from '../../schemas.js'
import { testi } from './composizioni.testi.js'

const t = () => testi().crea

/**
 * Un fascicolo nuovo. Lo schema chiede solo un nome e un elenco di testi: le
 * regole sui percorsi (sotto `esportazioni/`, niente `..`, `.pdf`, fra due e
 * duecento) le impone il gestore, che sa anche quali file esistono ancora.
 */
export const procedura = scrittura({
  nome: 'composizioni.crea',
  titolo: () => t().titolo,
  azione: 'composizione.crea',
  // Il nome decide il percorso del PDF: un secondo colpo con lo stesso nome è
  // rifiutato, e il disco resta com'era.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    nome: testo({ minimo: 1, aiuto: () => t().nome }),
    percorsi: elenco(testo({ minimo: 1 }), { aiuto: () => t().percorsi }),
  }),
  esegui: inoltra(composizioni, 'composizione.crea'),
})

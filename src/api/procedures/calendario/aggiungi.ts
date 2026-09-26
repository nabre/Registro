import { calendario } from '../../../actions/calendar.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, opzionale, testo } from '../../schemas.js'
import { testi } from './calendario.testi.js'

const t = () => testi().aggiungi

/**
 * Aggiunge un calendario ICS al documento e ne fa subito la copia.
 *
 * Non idempotente: due chiamate con due origini diverse fanno due calendari, e
 * con l'origine vuota quel che entra dipende dal file scelto nella finestra.
 * La stessa origine due volte si rifiuta.
 */
export const procedura = scrittura({
  nome: 'calendario.aggiungi',
  titolo: () => t().titolo,
  azione: 'calendario.aggiungi',
  idempotente: false,
  collezioni: ['registro'],
  ingresso: oggetto({
    origine: testo({ aiuto: () => t().origine }),
    nome: opzionale(testo({ aiuto: () => t().nome })),
  }),
  esegui: inoltra(calendario, 'calendario.aggiungi'),
})

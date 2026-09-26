import { calendario } from '../../../actions/calendar.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto, opzionale, testo } from '../../schemas.js'
import { calendarioDaLeggere } from './common.js'
import { testi } from './calendario.testi.js'

const t = () => testi().modifica

/**
 * Rinomina un calendario o gli cambia l'origine.
 *
 * Un'origine nuova si legge subito, e solo se si legge prende il posto della
 * vecchia con la sua copia. Idempotente: gli stessi valori due volte non
 * cambiano niente la seconda.
 */
export const procedura = scrittura({
  nome: 'calendario.modifica',
  titolo: () => t().titolo,
  azione: 'calendario.modifica',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({
    calendarioId: identificatore({ aiuto: () => t().calendarioId }),
    nome: opzionale(testo({ aiuto: () => t().nome })),
    origine: opzionale(testo({ aiuto: () => t().origine })),
  }),
  esegui: (ambito, ingresso) => {
    // Un id che nel documento non c'è è «non trovato», come nelle letture: chi
    // chiama sa che basta rileggere l'elenco.
    calendarioDaLeggere(ambito.contesto.registro, ingresso.calendarioId)
    return inoltra(calendario, 'calendario.modifica')(ambito, ingresso)
  },
})

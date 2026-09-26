import { calendario } from '../../../actions/calendar.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { calendarioDaLeggere } from './common.js'
import { testi } from './calendario.testi.js'

const t = () => testi().aggiorna

/**
 * Rilegge l'origine di un calendario e ne rifà la copia nel documento.
 *
 * Idempotente: due volte di fila scrivono la stessa copia. Se l'origine non si
 * legge la copia di prima resta.
 */
export const procedura = scrittura({
  nome: 'calendario.aggiorna',
  titolo: () => t().titolo,
  azione: 'calendario.aggiorna',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({
    calendarioId: identificatore({ aiuto: () => t().calendarioId }),
  }),
  esegui: (ambito, ingresso) => {
    // Un id che nel documento non c'è è «non trovato», come nelle letture: chi
    // chiama sa che basta rileggere l'elenco.
    calendarioDaLeggere(ambito.contesto.registro, ingresso.calendarioId)
    return inoltra(calendario, 'calendario.aggiorna')(ambito, ingresso)
  },
})

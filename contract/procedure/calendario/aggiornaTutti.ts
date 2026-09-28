import { calendario } from '../../../core/azioni/calendar.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto } from '../../schemas.js'
import { testi } from './calendario.testi.js'

const t = () => testi().aggiornaTutti

/**
 * Riscarica tutti i calendari ICS collegati con un indirizzo di rete e ne rifà
 * le copie nel documento; un file sul disco si rilegge da sé.
 *
 * Idempotente: due volte di fila scrivono le stesse copie. Chi non si legge
 * tiene la copia di prima e non ferma gli altri.
 */
export const procedura = scrittura({
  nome: 'calendario.aggiornaTutti',
  titolo: () => t().titolo,
  azione: 'calendario.aggiornaTutti',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({}),
  esegui: inoltra(calendario, 'calendario.aggiornaTutti'),
})

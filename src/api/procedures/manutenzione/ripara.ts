import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './manutenzione.testi.js'

const t = () => testi().ripara

export const procedura = scrittura({
  nome: 'manutenzione.ripara',
  titolo: () => t().titolo,
  azione: 'manutenzione.ripara',
  // Alla seconda chiamata non c'è più niente da riparare, e lo si dice.
  idempotente: true,
  // Tutte le raccolte che `domain/repairs.ts` sa correggere: quali tocca davvero
  // dipende dalle correzioni trovate.
  collezioni: ['registro', 'classi', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne'],
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'manutenzione.ripara'),
})

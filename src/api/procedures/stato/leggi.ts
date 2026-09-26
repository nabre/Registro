import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './stato.testi.js'

const t = () => testi().leggi

/**
 * Il segnale che un pannello si è aperto: rilegge `templates/`, che può essere
 * cambiata da fuori, e la risposta arriva con lo stato spinto al pannello.
 */
export const procedura = scrittura({
  nome: 'stato.leggi',
  // `scrittura`: cambia lo stato dell'applicazione ed è il segnale «sono pronto»
  // che sblocca la navigazione del pannello, quindi fuori dal canale delle
  // domande.
  titolo: () => t().titolo,
  azione: 'stato.leggi',
  idempotente: true,
  ingresso: vuoto(),
  esegui: inoltra(registro, 'stato.leggi'),
})

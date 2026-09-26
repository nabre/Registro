// Chiede subito se c'è una versione nuova. Torna prima di saperlo: la risposta
// arriva con lo stato degli aggiornamenti (da fuori, `aggiornamenti.stato`).
// Idempotente: un secondo controllo durante il primo non fa niente.

import { aggiornamenti } from '../../../actions/updates.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './aggiornamenti.testi.js'

export const procedura = scrittura({
  nome: 'aggiornamenti.controlla',
  titolo: () => testi().controlla.titolo,
  azione: 'aggiornamenti.controlla',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(aggiornamenti, 'aggiornamenti.controlla'),
})

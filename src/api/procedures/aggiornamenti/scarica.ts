// Scarica la versione nuova già trovata, quando lo scarico automatico è spento.
// Durante o dopo lo scarico non fa niente.

import { aggiornamenti } from '../../../actions/updates.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './aggiornamenti.testi.js'

export const procedura = scrittura({
  nome: 'aggiornamenti.scarica',
  titolo: () => testi().scarica.titolo,
  azione: 'aggiornamenti.scarica',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(aggiornamenti, 'aggiornamenti.scarica'),
})

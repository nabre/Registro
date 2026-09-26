// Chiude il registro. Nessuna conferma: il documento si salva a ogni modifica.
//
// `scrittura`: chiudere il registro non si concede alla sola lettura, né al
// modello dell'assistente (non dichiara `assistente`).

import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './programma.testi.js'

export const procedura = scrittura({
  nome: 'programma.esci',
  titolo: () => testi().esci.titolo,
  azione: 'programma.esci',
  // Chiuderlo due volte lo lascia chiuso.
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'programma.esci'),
})

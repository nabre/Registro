// La finestra di chi insegna a schermo intero, e ritorno. Non è
// `proiezione.schermo`, che accende lo schermo per la classe sul secondo
// monitor.
//
// `scrittura` come `vista.apri`: il genere dice chi può chiamarla da fuori.

import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './finestra.testi.js'

const t = () => testi().schermoIntero

export const procedura = scrittura({
  nome: 'finestra.schermoIntero',
  titolo: () => t().titolo,
  azione: 'finestra.schermoIntero',
  // È un interruttore: chiamarla due volte riporta la finestra dov'era.
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'finestra.schermoIntero'),
})

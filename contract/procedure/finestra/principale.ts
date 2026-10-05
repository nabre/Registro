// Davanti la finestra principale del registro, da una figlia.

import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './finestra.testi.js'

export const procedura = scrittura({
  nome: 'finestra.principale',
  titolo: () => testi().principale.titolo,
  azione: 'finestra.principale',
  // Già davanti, resta davanti.
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'finestra.principale'),
})

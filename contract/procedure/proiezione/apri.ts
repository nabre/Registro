import { proiezione } from '#core/azioni/projection.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './proiezione.testi.js'

export const procedura = scrittura({
  nome: 'proiezione.apri',
  titolo: () => testi().apri.titolo,
  azione: 'proiezione.apri',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(proiezione, 'proiezione.apri'),
})

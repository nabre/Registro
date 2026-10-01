import { proiezione } from '#core/azioni/projection.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './proiezione.testi.js'

export const procedura = scrittura({
  nome: 'proiezione.chiudi',
  titolo: () => testi().chiudi.titolo,
  azione: 'proiezione.chiudi',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(proiezione, 'proiezione.chiudi'),
})

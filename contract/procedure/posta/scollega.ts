import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './posta.testi.js'

export const procedura = scrittura({
  nome: 'posta.scollega',
  titolo: () => testi().scollega.titolo,
  azione: 'posta.scollega',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'posta.scollega'),
})

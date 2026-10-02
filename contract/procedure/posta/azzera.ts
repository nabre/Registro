import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './posta.testi.js'

export const procedura = scrittura({
  nome: 'posta.azzera',
  titolo: () => testi().azzera.titolo,
  azione: 'posta.azzera',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(sistema, 'posta.azzera'),
})

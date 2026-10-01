import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().lettura.ferma

/**
 * La coda svuotata. Idempotente. `collezioni` è vuoto perché non scrive
 * niente, ma resta `scrittura`: ferma del lavoro, non risponde a una domanda.
 */
export const procedura = scrittura({
  nome: 'smistamento.lettura.ferma',
  titolo: () => t().titolo,
  azione: 'smistamento.fermaLettura',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  esegui: inoltra(smistamento, 'smistamento.fermaLettura'),
})

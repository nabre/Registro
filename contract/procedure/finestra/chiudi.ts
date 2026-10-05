// Chiude una finestra figlia del registro, per numero: dal menu delle
// finestre. La principale no: chiusa lei si chiudono tutte, e lo si fa dalla
// sua ✕.

import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { numero, oggetto } from '#contract/schemas.js'
import { testi } from './finestra.testi.js'

const t = () => testi().chiudi

export const procedura = scrittura({
  nome: 'finestra.chiudi',
  titolo: () => t().titolo,
  azione: 'finestra.chiudi',
  // Chiusa una volta, la seconda non la trova più.
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    n: numero({ intero: true, minimo: 2, massimo: 7, aiuto: () => t().n }),
  }),
  esegui: inoltra(sistema, 'finestra.chiudi'),
})

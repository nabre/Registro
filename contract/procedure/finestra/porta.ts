// Davanti una finestra del registro, per numero: dal menu delle finestre.

import { sistema } from '#core/azioni/system.js'
import { inoltra, scrittura } from '#contract/core.js'
import { numero, oggetto } from '#contract/schemas.js'
import { testi } from './finestra.testi.js'

const t = () => testi().porta

export const procedura = scrittura({
  nome: 'finestra.porta',
  titolo: () => t().titolo,
  azione: 'finestra.porta',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    n: numero({ intero: true, minimo: 1, massimo: 7, aiuto: () => t().n }),
  }),
  esegui: inoltra(sistema, 'finestra.porta'),
})

import { consegne } from '#core/azioni/assignments.js'
import type { Consegna } from '#core/dominio/models.js'
import { validaConsegna } from '#core/dominio/validation.js'
import { inoltra, scrittura } from '#contract/core.js'
import { entita, oggetto } from '#contract/schemas.js'
import { testi } from './consegne.testi.js'

const t = () => testi().salva

export const procedura = scrittura({
  nome: 'consegne.salva',
  titolo: () => t().titolo,
  azione: 'consegna.salva',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    // Il merito lo giudica `validaConsegna` (destinatari, scadenze, posta).
    consegna: entita<Consegna>({ cosa: () => t().consegna, valida: validaConsegna }),
  }),
  esegui: inoltra(consegne, 'consegna.salva'),
})

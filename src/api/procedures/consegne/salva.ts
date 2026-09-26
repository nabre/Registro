import { consegne } from '../../../actions/assignments.js'
import type { Consegna } from '../../../domain/models.js'
import { validaConsegna } from '../../../domain/validation.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
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

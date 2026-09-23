import { consegne } from '../../../actions/assignments.js'
import type { Consegna } from '../../../domain/models.js'
import { validaConsegna } from '../../../domain/validation.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'consegne.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Salva una consegna intera, o ne crea una nuova',
  azione: 'consegna.salva',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    // Il merito lo giudica `validaConsegna`, che sa dei destinatari, delle
    // scadenze e dei campi della posta. Qui non se ne ridice nemmeno uno.
    consegna: entita<Consegna>({ cosa: 'Consegna', valida: validaConsegna }),
  }),
  uscita: SCRITTURA,
  esegui: daGestore(consegne['consegna.salva'], (i: { consegna: Consegna }) => ({
    tipo: 'consegna.salva' as const, ...i,
  })),
})

import { valutazioni } from '../../../actions/assessments.js'
import type { MomentoValutazione } from '../../../domain/models.js'
import { validaValutazione } from '../../../domain/validation.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'valutazioni.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Salva un momento di valutazione intero, o ne crea uno nuovo',
  azione: 'valutazione.salva',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    // Il merito lo giudica `validaValutazione`, che sa della scala, dei pesi e
    // delle date; qui non si ridice nemmeno un campo, altrimenti sarebbero due
    // verità e la seconda resterebbe indietro al primo campo nuovo.
    valutazione: entita<MomentoValutazione>({
      cosa: 'Momento di valutazione',
      valida: validaValutazione,
    }),
  }),
  uscita: SCRITTURA,
  esegui: daGestore(valutazioni['valutazione.salva'], (i: { valutazione: MomentoValutazione }) => ({
    tipo: 'valutazione.salva' as const, ...i,
  })),
})

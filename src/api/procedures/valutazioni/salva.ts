import { valutazioni } from '../../../actions/assessments.js'
import { Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { MomentoValutazione } from '../../../domain/models.js'
import { validaValutazione } from '../../../domain/validation.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { testi } from './valutazioni.testi.js'

export const procedura = scrittura({
  nome: 'valutazioni.salva',
  titolo: () => testi().salva.titolo,
  azione: 'valutazione.salva',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    // Il merito lo giudica `validaValutazione` (scala, pesi, date); qui non si
    // ridice nessun campo.
    valutazione: entita<MomentoValutazione>({
      cosa: () => Uno(lessico().momento),
      valida: validaValutazione,
    }),
  }),
  esegui: inoltra(valutazioni, 'valutazione.salva'),
})

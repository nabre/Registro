import { valutazioni } from '#core/azioni/assessments.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { MomentoValutazione } from '#core/dominio/models.js'
import { validaValutazione } from '#core/dominio/validation.js'
import { inoltra, scrittura } from '#contract/core.js'
import { entita, oggetto } from '#contract/schemas.js'
import { esigiLezione, esigiPiano } from '#contract/procedure/common/plans.js'
import { esigiCorso } from '#contract/procedure/common/register.js'
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
  esegui: (ambito, ingresso) => {
    const { corsoId, lezioneId, pianoId } = ingresso.valutazione
    esigiCorso(ambito, corsoId)
    if (lezioneId) esigiLezione(ambito, lezioneId)
    if (pianoId) esigiPiano(ambito, pianoId)
    return inoltra(valutazioni, 'valutazione.salva')(ambito, ingresso)
  },
})

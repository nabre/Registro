import { valutazioni } from '../../../actions/assessments.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, nullabile, oggetto } from '../../schemas.js'
import { esigiMomento } from './common.js'
import { testi } from './valutazioni.testi.js'

const t = () => testi().riconsegna

export const procedura = scrittura({
  nome: 'valutazioni.riconsegna',
  titolo: () => t().titolo,
  azione: 'valutazione.riconsegna',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    // La chiave c'è sempre e `null` toglie la data a tutti: basta `nullabile`.
    il: nullabile(iso({ aiuto: () => t().il })),
  }),
  esegui: (ambito, ingresso) => {
    esigiMomento(ambito, ingresso.valutazioneId)
    return inoltra(valutazioni, 'valutazione.riconsegna')(ambito, ingresso)
  },
})

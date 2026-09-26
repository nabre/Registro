import { valutazioni } from '../../../../actions/assessments.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiAllegato } from '../common.js'
import { testi } from '../valutazioni.testi.js'

export const procedura = scrittura({
  nome: 'valutazioni.allegato.elimina',
  titolo: () => testi().allegato.elimina.titolo,
  azione: 'allegato.elimina',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allegatoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiAllegato(ambito, ingresso.valutazioneId, ingresso.allegatoId)
    return inoltra(valutazioni, 'allegato.elimina')(ambito, ingresso)
  },
})

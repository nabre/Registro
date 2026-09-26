import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiLezione } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'
import { testi } from '../ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.appello.tutti',
  titolo: () => testi().appello.tutti.titolo,
  azione: 'presenze.tutti',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    stato: scelta(STATI_APPELLO),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'presenze.tutti')(ambito, ingresso)
  },
})

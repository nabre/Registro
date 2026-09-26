import { ore } from '../../../actions/hours.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto, scelta } from '../../schemas.js'
import { esigiLezione, STATI_LEZIONE } from './common.js'
import { testi } from './ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.stato',
  titolo: () => testi().stato.titolo,
  azione: 'lezione.stato',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    stato: scelta(STATI_LEZIONE),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'lezione.stato')(ambito, ingresso)
  },
})

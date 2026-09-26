import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiIscritto, esigiLezione } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'
import { testi } from '../ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.appello.riga',
  titolo: () => testi().appello.riga.titolo,
  azione: 'presenze.riga',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    allievoId: identificatore(),
    stato: scelta(STATI_APPELLO),
  }),
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    esigiIscritto(ambito, lezione, ingresso.allievoId)
    return inoltra(ore, 'presenze.riga')(ambito, ingresso)
  },
})

import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, numero, oggetto, scelta } from '../../../schemas.js'
import { esigiIscritto, esigiLezione, esigiUd } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'
import { testi } from '../ore.testi.js'

const t = () => testi().appello.casella

export const procedura = scrittura({
  nome: 'ore.appello.casella',
  titolo: () => t().titolo,
  azione: 'presenze.ud',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore({ aiuto: () => t().lezioneId }),
    allievoId: identificatore({ aiuto: () => t().allievoId }),
    ud: numero({ intero: true, minimo: 0, massimo: 32, aiuto: () => t().ud }),
    stato: scelta(STATI_APPELLO, { aiuto: () => t().stato }),
  }),
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    esigiUd(ambito, lezione, ingresso.ud)
    esigiIscritto(ambito, lezione, ingresso.allievoId)
    return inoltra(ore, 'presenze.ud')(ambito, ingresso)
  },
})

import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, numero, oggetto, scelta } from '../../../schemas.js'
import { esigiLezione, esigiUd } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'
import { testi } from '../ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.appello.colonna',
  titolo: () => testi().appello.colonna.titolo,
  azione: 'presenze.colonna',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    ud: numero({ intero: true, minimo: 0, massimo: 32 }),
    stato: scelta(STATI_APPELLO),
  }),
  esegui: (ambito, ingresso) => {
    esigiUd(ambito, esigiLezione(ambito, ingresso.lezioneId), ingresso.ud)
    return inoltra(ore, 'presenze.colonna')(ambito, ingresso)
  },
})

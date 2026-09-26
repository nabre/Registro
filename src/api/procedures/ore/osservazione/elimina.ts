import { ore } from '../../../../actions/hours.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiLezione } from '../common.js'
import { testi } from '../ore.testi.js'

export const procedura = scrittura({
  nome: 'ore.osservazione.elimina',
  titolo: () => testi().osservazione.elimina.titolo,
  azione: 'osservazione.elimina',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    osservazioneId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    // Si controlla l'ora, non l'annotazione: un'annotazione già sparita è quel che
    // si voleva, un'ora che non c'è va detta con il suo codice.
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'osservazione.elimina')(ambito, ingresso)
  },
})

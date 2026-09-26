import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { testi } from './esporta.testi.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiLezione } from '../common/plans.js'

export const procedura = scrittura({
  nome: 'esporta.lezione',
  titolo: () => testi().lezione.titolo,
  azione: 'esporta.lezione',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ lezioneId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(sistema, 'esporta.lezione')(ambito, ingresso)
  },
})

import { valutazioni } from '../../../actions/assessments.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiMomento } from './common.js'
import { testi } from './valutazioni.testi.js'

export const procedura = scrittura({
  nome: 'valutazioni.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'valutazione.elimina',
  // Il secondo giro trova il momento già sparito e lo dice.
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({ valutazioneId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiMomento(ambito, ingresso.valutazioneId)
    return inoltra(valutazioni, 'valutazione.elimina')(ambito, ingresso)
  },
})

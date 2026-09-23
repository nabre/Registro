import { valutazioni } from '../../../actions/assessments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiMomento } from './common.js'

export const procedura = definisci({
  nome: 'valutazioni.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Butta via un momento di valutazione, con i suoi voti e i suoi PDF',
  azione: 'valutazione.elimina',
  // Rieseguirla dopo un errore di trasporto è sicuro: il secondo giro trova il
  // momento già sparito e lo dice, e il registro resta come dopo il primo.
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({ valutazioneId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiMomento(ambito, ingresso.valutazioneId)
    return daGestore(valutazioni['valutazione.elimina'], (i: typeof ingresso) => ({
      tipo: 'valutazione.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

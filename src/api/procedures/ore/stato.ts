import { ore } from '../../../actions/hours.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto, scelta } from '../../schemas.js'
import { esigiLezione, STATI_LEZIONE } from './common.js'

export const procedura = definisci({
  nome: 'ore.stato',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Pianificata, svolta o annullata',
  azione: 'lezione.stato',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    stato: scelta(STATI_LEZIONE),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['lezione.stato'], (i: typeof ingresso) => ({
      tipo: 'lezione.stato' as const, ...i,
    }))(ambito, ingresso)
  },
})

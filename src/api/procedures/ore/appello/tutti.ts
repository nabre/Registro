import { ore } from '../../../../actions/hours.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiLezione } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'

export const procedura = definisci({
  nome: 'ore.appello.tutti',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Segna l’appello intero allo stesso modo',
  azione: 'presenze.tutti',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    stato: scelta(STATI_APPELLO),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['presenze.tutti'], (i: typeof ingresso) => ({
      tipo: 'presenze.tutti' as const, ...i,
    }))(ambito, ingresso)
  },
})

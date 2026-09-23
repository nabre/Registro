import { ore } from '../../../../actions/hours.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, numero, oggetto, scelta } from '../../../schemas.js'
import { esigiLezione, esigiUd } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'

export const procedura = definisci({
  nome: 'ore.appello.colonna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Segna un’unità didattica per tutta la classe',
  azione: 'presenze.colonna',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    ud: numero({ intero: true, minimo: 0, massimo: 32 }),
    stato: scelta(STATI_APPELLO),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiUd(esigiLezione(ambito, ingresso.lezioneId), ingresso.ud)
    return daGestore(ore['presenze.colonna'], (i: typeof ingresso) => ({
      tipo: 'presenze.colonna' as const, ...i,
    }))(ambito, ingresso)
  },
})

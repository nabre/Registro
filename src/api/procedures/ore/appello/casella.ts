import { ore } from '../../../../actions/hours.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, numero, oggetto, scelta } from '../../../schemas.js'
import { esigiIscritto, esigiLezione, esigiUd } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'

export const procedura = definisci({
  nome: 'ore.appello.casella',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Segna una casella dell’appello: una persona, un’unità didattica',
  azione: 'presenze.ud',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore({ aiuto: 'L’ora su cui si scrive' }),
    allievoId: identificatore({ aiuto: 'Chi si sta segnando' }),
    ud: numero({ intero: true, minimo: 0, massimo: 32, aiuto: 'L’unità didattica, contata da zero' }),
    stato: scelta(STATI_APPELLO, { aiuto: 'Come risulta quella persona in quell’unità' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    esigiUd(lezione, ingresso.ud)
    esigiIscritto(ambito, lezione, ingresso.allievoId)
    return daGestore(ore['presenze.ud'], (i: typeof ingresso) => ({
      tipo: 'presenze.ud' as const, ...i,
    }))(ambito, ingresso)
  },
})

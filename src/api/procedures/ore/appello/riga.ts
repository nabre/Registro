import { ore } from '../../../../actions/hours.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiIscritto, esigiLezione } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'

export const procedura = definisci({
  nome: 'ore.appello.riga',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Segna l’ora intera per una persona',
  azione: 'presenze.riga',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    allievoId: identificatore(),
    stato: scelta(STATI_APPELLO),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    esigiIscritto(ambito, lezione, ingresso.allievoId)
    return daGestore(ore['presenze.riga'], (i: typeof ingresso) => ({
      tipo: 'presenze.riga' as const, ...i,
    }))(ambito, ingresso)
  },
})

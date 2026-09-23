import { ore } from '../../../actions/hours.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, iso, oggetto, opzionale, ora } from '../../schemas.js'
import { esigiLezione } from './common.js'

export const procedura = definisci({
  nome: 'ore.duplica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Una copia dell’ora un altro giorno: stessa scaletta, appello e voti no',
  azione: 'lezione.duplica',
  // Ogni chiamata mette a calendario un'ora nuova: ritentarla dopo un guasto
  // di trasporto raddoppia la lezione, e chi chiama deve saperlo prima.
  idempotente: false,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore({ aiuto: 'L’ora da ricopiare' }),
    data: iso({ aiuto: 'Il giorno in cui va la copia' }),
    inizio: opzionale(ora({
      aiuto: 'L’ora d’inizio della copia. Senza, restano le fasce dell’originale',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['lezione.duplica'], (i: typeof ingresso) => ({
      tipo: 'lezione.duplica' as const, ...i,
    }))(ambito, ingresso)
  },
})

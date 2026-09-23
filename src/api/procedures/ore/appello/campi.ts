import { ore } from '../../../../actions/hours.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, numero, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiIscritto, esigiLezione } from '../common.js'

/** Il numero massimo di minuti di ritardo che si accettano: mezza giornata. */
const MINUTI_MASSIMI = 600

export const procedura = definisci({
  nome: 'ore.appello.campi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'I minuti di ritardo e la nota di una riga dell’appello',
  azione: 'presenze.campi',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    allievoId: identificatore(),
    minuti: opzionale(numero({
      intero: true, minimo: 0, massimo: MINUTI_MASSIMI,
      aiuto: 'Minuti di ritardo. Lasciato fuori, resta quel che c’era',
    })),
    nota: opzionale(testo({ massimo: 500 })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    esigiIscritto(ambito, lezione, ingresso.allievoId)
    return daGestore(ore['presenze.campi'], (i: typeof ingresso) => ({
      tipo: 'presenze.campi' as const, ...i,
    }))(ambito, ingresso)
  },
})

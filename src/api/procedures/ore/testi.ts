import { ore } from '../../../actions/hours.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto, opzionale, testo } from '../../schemas.js'
import { esigiLezione } from './common.js'

export const procedura = definisci({
  nome: 'ore.testi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Argomenti, materiali e consuntivo dell’ora, un campo alla volta',
  azione: 'lezione.testi',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    argomenti: opzionale(testo({ massimo: 4000 })),
    materiali: opzionale(testo({ massimo: 4000 })),
    consuntivo: opzionale(testo({ massimo: 4000 })),
  }, { aiuto: 'Solo i campi presenti si scrivono: gli altri restano com’erano' }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['lezione.testi'], (i: typeof ingresso) => ({
      tipo: 'lezione.testi' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { ore } from '../../../actions/hours.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiLezione } from './common.js'

export const procedura = definisci({
  nome: 'ore.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un’ora dal calendario, con appello, osservazioni e consuntivo',
  azione: 'lezione.elimina',
  // Due volte di fila lasciano il registro come una volta sola: la seconda non
  // trova più niente da togliere, e lo dice con «non trovato».
  idempotente: true,
  // Momenti di valutazione e consegne non se ne vanno con l'ora: perdono il
  // rimando, e i loro file vanno riscritti lo stesso.
  collezioni: ['lezioni', 'valutazioni', 'consegne'],
  ingresso: oggetto({ lezioneId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Il gestore direbbe «non c'è più niente da eliminare» con un rifiuto: qui
    // diventa «non-trovato», che è l'unico codice su cui chi chiama da fuori
    // può decidere di rileggere invece di ritentare.
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['lezione.elimina'], (i: typeof ingresso) => ({
      tipo: 'lezione.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

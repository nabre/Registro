import { ore } from '../../../../actions/hours.js'
import type { Osservazione } from '../../../../domain/models.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiLezione } from '../common.js'

export const procedura = definisci({
  nome: 'ore.osservazione.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive un’annotazione sull’ora: di una persona, o della classe intera',
  azione: 'osservazione.salva',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    // Senza `valida`: il dominio non ha un validatore dell'osservazione — la
    // sola regola, «il testo non è vuoto», sta nel gestore e ci resta. Qui si
    // controlla la forma e basta, che è quel che `entita` fa da sola.
    osservazione: entita<Osservazione>({
      cosa: 'Osservazione',
      aiuto: 'L’annotazione intera. `allievoId` nullo vuol dire «tutta la classe»',
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['osservazione.salva'], (i: typeof ingresso) => ({
      tipo: 'osservazione.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})

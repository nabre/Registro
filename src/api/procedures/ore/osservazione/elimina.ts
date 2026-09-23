import { ore } from '../../../../actions/hours.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiLezione } from '../common.js'

export const procedura = definisci({
  nome: 'ore.osservazione.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un’annotazione da un’ora',
  azione: 'osservazione.elimina',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    osservazioneId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Si guarda l'ora e non l'annotazione: il gestore filtra, e una
    // cancellazione che non trova più niente ha già ottenuto quel che voleva.
    // L'ora, invece, se non c'è è un altro discorso — si sta scrivendo nel
    // vuoto — e va detto con il suo codice.
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['osservazione.elimina'], (i: typeof ingresso) => ({
      tipo: 'osservazione.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

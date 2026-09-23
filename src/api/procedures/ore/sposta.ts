import { ore } from '../../../actions/hours.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, iso, oggetto, opzionale, ora } from '../../schemas.js'
import { esigiLezione } from './common.js'

export const procedura = definisci({
  nome: 'ore.sposta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'La stessa ora un altro giorno, e — se si dice — a un’altra ora',
  azione: 'lezione.sposta',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    data: iso({ aiuto: 'Il giorno nuovo' }),
    inizio: opzionale(ora({
      aiuto: 'Senza, il giorno cambia e le fasce restano dov’erano',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(ore['lezione.sposta'], (i: typeof ingresso) => ({
      tipo: 'lezione.sposta' as const, ...i,
    }))(ambito, ingresso)
  },
})

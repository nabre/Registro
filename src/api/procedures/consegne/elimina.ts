import { consegne } from '../../../actions/assignments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiConsegna } from './common.js'

export const procedura = definisci({
  nome: 'consegne.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Butta via una consegna, con i documenti che aveva raccolto',
  azione: 'consegna.elimina',
  // Rieseguirla è sicuro: al secondo giro la consegna non c'è più e lo si
  // dice, e il registro resta come dopo il primo.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({ consegnaId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.elimina'], (i: typeof ingresso) => ({
      tipo: 'consegna.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

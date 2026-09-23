import { consegne } from '../../../actions/assignments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { booleano, identificatore, oggetto } from '../../schemas.js'
import { esigiConsegna } from './common.js'

export const procedura = definisci({
  nome: 'consegne.spuntaTutti',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Spunta tutti quelli che mancano, o toglie le spunte nude',
  azione: 'consegna.spuntaTutti',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    fatta: booleano({ aiuto: 'false toglie solo le spunte senza documento raccolto' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.spuntaTutti'], (i: typeof ingresso) => ({
      tipo: 'consegna.spuntaTutti' as const, ...i,
    }))(ambito, ingresso)
  },
})

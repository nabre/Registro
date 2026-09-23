import { composizioni } from '../../../actions/compositions.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiComposizione } from './common.js'

export const procedura = definisci({
  nome: 'composizioni.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Butta via un fascicolo: la ricetta e il suo PDF',
  azione: 'composizione.elimina',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ id: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiComposizione(ingresso.id)
    return daGestore(composizioni['composizione.elimina'], (i: typeof ingresso) => ({
      tipo: 'composizione.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { composizioni } from '../../../actions/compositions.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiComposizione } from './common.js'

export const procedura = definisci({
  nome: 'composizioni.aggiorna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Rifà il PDF di un fascicolo con i fogli che ci sono adesso',
  azione: 'composizione.aggiorna',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ id: identificatore({ aiuto: 'La composizione da rifare' }) }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiComposizione(ingresso.id)
    return daGestore(composizioni['composizione.aggiorna'], (i: typeof ingresso) => ({
      tipo: 'composizione.aggiorna' as const, ...i,
    }))(ambito, ingresso)
  },
})

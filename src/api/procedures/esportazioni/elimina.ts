import { esportazioni } from '../../../actions/exports.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { esigiDocumento } from './common.js'

export const procedura = definisci({
  nome: 'esportazioni.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Butta via un documento esportato',
  azione: 'esportazione.elimina',
  // Il secondo colpo trova il vuoto e lo dice, ma non toglie niente di nuovo:
  // ritentare dopo un errore di trasporto è senza danno.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ percorso: testo({ minimo: 1 }) }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiDocumento(ingresso.percorso)
    return daGestore(esportazioni['esportazione.elimina'], (i: typeof ingresso) => ({
      tipo: 'esportazione.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

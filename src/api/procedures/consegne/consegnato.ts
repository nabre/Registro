import { consegne } from '../../../actions/assignments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { booleano, identificatore, oggetto } from '../../schemas.js'
import { esigiConsegna } from './common.js'

export const procedura = definisci({
  nome: 'consegne.consegnato',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Consegnato a mano: la spunta che resta di un foglio dato in aula',
  azione: 'consegna.consegnato',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: identificatore({ aiuto: 'Chi ha ricevuto il foglio' }),
    fatta: booleano({ aiuto: 'false rimette il documento fra quelli da consegnare' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.consegnato'], (i: typeof ingresso) => ({
      tipo: 'consegna.consegnato' as const, ...i,
    }))(ambito, ingresso)
  },
})

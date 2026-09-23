import { esportazioni } from '../../../actions/exports.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, opzionale, testo } from '../../schemas.js'
import { esigiDocumento } from './common.js'

export const procedura = definisci({
  nome: 'esportazioni.mostra',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mostra un documento esportato nella cornice del registro',
  azione: 'esportazione.mostra',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    percorso: testo({ minimo: 1 }),
    titolo: opzionale(testo({ aiuto: 'Il nome in cima alla finestra. Senza, il nome del file' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiDocumento(ingresso.percorso)
    return daGestore(esportazioni['esportazione.mostra'], (i: typeof ingresso) => ({
      tipo: 'esportazione.mostra' as const, ...i,
    }))(ambito, ingresso)
  },
})

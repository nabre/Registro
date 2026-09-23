import { esportazioni } from '../../../actions/exports.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { esigiDocumento } from './common.js'

export const procedura = definisci({
  nome: 'esportazioni.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre un documento già esportato con il programma del sistema',
  azione: 'esportazione.apri',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    percorso: testo({ minimo: 1, aiuto: 'Relativo alla cartella dei dati, `esportazioni/` compreso' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiDocumento(ingresso.percorso)
    return daGestore(esportazioni['esportazione.apri'], (i: typeof ingresso) => ({
      tipo: 'esportazione.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

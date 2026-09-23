import { consegne } from '../../../../actions/assignments.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna, perChi } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.documento.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre il documento pronto con il programma del sistema',
  azione: 'consegna.documento.apri',
  // Non tocca il registro — `collezioni` resta perciò vuoto — ma `scrittura`
  // lo è lo stesso: è un'azione del protocollo, cioè un gesto con un effetto
  // fuori di qui, e «lettura» in questo contratto vuol dire una domanda a cui
  // si può rispondere senza che succeda niente.
  idempotente: true,
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: perChi,
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Che il documento ci sia lo dice il gestore: «non c'è nessun documento
    // pronto da aprire» è un rifiuto con un rimedio, non una voce sparita.
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.documento.apri'], (i: typeof ingresso) => ({
      tipo: 'consegna.documento.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

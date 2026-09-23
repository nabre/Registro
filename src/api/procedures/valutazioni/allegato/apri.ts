import { valutazioni } from '../../../../actions/assessments.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiAllegato } from '../common.js'

export const procedura = definisci({
  nome: 'valutazioni.allegato.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre il PDF appeso a una prova con il visualizzatore del sistema',
  azione: 'allegato.apri',
  // Non tocca il registro — `collezioni` resta perciò vuoto — ma `scrittura`
  // lo è lo stesso: è un'azione del protocollo, cioè un gesto con un effetto
  // fuori di qui, e «lettura» in questo contratto vuol dire una domanda a cui
  // si può rispondere senza che succeda niente.
  idempotente: true,
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allegatoId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiAllegato(ambito, ingresso.valutazioneId, ingresso.allegatoId)
    return daGestore(valutazioni['allegato.apri'], (i: typeof ingresso) => ({
      tipo: 'allegato.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

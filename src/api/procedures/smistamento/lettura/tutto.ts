import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento } from '../common.js'

/** Tutte le pagine mute di un PDF, in coda. */
export const procedura = definisci({
  nome: 'smistamento.lettura.tutto',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Accoda la lettura OCR di tutte le pagine mute di un PDF. Torna subito',
  azione: 'smistamento.leggiTutto',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.leggiTutto'], (i: typeof ingresso) => ({
      tipo: 'smistamento.leggiTutto' as const, ...i,
    }))(ambito, ingresso)
  },
})

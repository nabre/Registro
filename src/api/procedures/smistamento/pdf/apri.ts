import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento } from '../common.js'

/**
 * Il PDF originale aperto nel lettore del sistema.
 *
 * Non tocca il registro — `collezioni` è vuoto — ma `genere` resta `scrittura`
 * perché non è innocua: fa comparire una finestra sullo schermo di qualcuno, e
 * una riga di comando che la considerasse una domanda la chiamerebbe per
 * sapere qualcosa. Idempotente rispetto al registro, che non cambia.
 */
export const procedura = definisci({
  nome: 'smistamento.pdf.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre il PDF originale nel lettore del sistema',
  azione: 'smistamento.apri',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.apri'], (i: typeof ingresso) => ({
      tipo: 'smistamento.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

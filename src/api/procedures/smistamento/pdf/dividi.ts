import { smistamento } from '../../../../actions/sorting.js'
import { daGestore, scrittura } from '../../../core.js'
import { identificatore, oggetto, opzionale } from '../../../schemas.js'
import { comeDivisione, divisione, esigiSmistamento } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pdf.dividi

/**
 * Il modo di taglio cambiato su un PDF già in attesa. Legacy: nessuna vista la
 * manda, la usa `tests/data/sorting.test.mjs`; si toglie insieme a quelle
 * prove. Idempotente.
 */
export const procedura = scrittura({
  nome: 'smistamento.pdf.dividi',
  titolo: () => t().titolo,
  azione: 'smistamento.dividi',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    divisione: opzionale(divisione()),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.dividi'], (i: typeof ingresso) => ({
      tipo: 'smistamento.dividi' as const, ...i, divisione: comeDivisione(i.divisione),
    }))(ambito, ingresso)
  },
})

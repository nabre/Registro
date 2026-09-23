import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento } from '../common.js'

/**
 * Tutto quel che resta nel cestino.
 *
 * Idempotente rispetto al registro: la riga o c'è o non c'è, e alla seconda
 * chiamata la guardia risponde che non c'è più. Nel cestino di sistema e non
 * cancellato, come ogni altro file del registro: il dubbio su un ritaglio
 * viene sempre dopo.
 */
export const procedura = definisci({
  nome: 'smistamento.pdf.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Butta nel cestino il PDF e la riga che lo aspettava',
  azione: 'smistamento.elimina',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.elimina'], (i: typeof ingresso) => ({
      tipo: 'smistamento.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

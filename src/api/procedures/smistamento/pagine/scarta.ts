import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'

/**
 * Le pagine buttate via.
 *
 * Idempotente nel senso che conta: rifarla con le stesse pagine lascia il
 * registro com'era dopo la prima: quelle pagine erano già uscite dalle
 * letture. Si può quindi ritentare dopo un errore di trasporto — anche se, se
 * la prima volta ha chiuso lo smistamento, la seconda risponderà che non c'è
 * più.
 */
export const procedura = definisci({
  nome: 'smistamento.pagine.scarta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie dalla quarantena le pagine che non sono di nessuno',
  azione: 'smistamento.scartaPagine',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.scartaPagine'], (i: typeof ingresso) => ({
      tipo: 'smistamento.scartaPagine' as const, ...i,
    }))(ambito, ingresso)
  },
})

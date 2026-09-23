import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'

/**
 * Solo quelle pagine, ritagliate e aperte nel lettore.
 *
 * Non idempotente, e non per via del registro: il registro non si muove. Ogni
 * chiamata **scrive un ritaglio nuovo** fra le copie di servizio del deposito,
 * e se quello di prima è ancora aperto il deposito numera il nuovo. Due
 * chiamate lasciano due file, e dichiararla idempotente prometterebbe sul
 * disco una cosa che non è vera.
 */
export const procedura = definisci({
  nome: 'smistamento.pagine.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Ritaglia le pagine scelte in un file di servizio e le apre nel lettore',
  azione: 'smistamento.apriPagine',
  idempotente: false,
  collezioni: [],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.apriPagine'], (i: typeof ingresso) => ({
      tipo: 'smistamento.apriPagine' as const, ...i,
    }))(ambito, ingresso)
  },
})

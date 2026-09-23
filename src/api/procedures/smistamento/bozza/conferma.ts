import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento } from '../common.js'

/**
 * Tutta la bozza in un gesto.
 *
 * Non idempotente, ed è quella che se ne accorge di più: ogni riga con un nome
 * diventa un documento, e al secondo giro non resta niente da confermare — il
 * gestore risponde «Non c'è nessuna proposta da confermare».
 */
export const procedura = definisci({
  nome: 'smistamento.bozza.conferma',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Archivia in blocco tutte le proposte che hanno già un nome',
  azione: 'smistamento.confermaTutto',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return daGestore(smistamento['smistamento.confermaTutto'], (i: typeof ingresso) => ({
      tipo: 'smistamento.confermaTutto' as const, ...i,
    }))(ambito, ingresso)
  },
})

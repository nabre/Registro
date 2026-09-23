import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse, esigiSmistamento } from '../common.js'

/**
 * Di quale classe è un PDF.
 *
 * Idempotente: il gestore torna subito se la classe è già quella e non c'è più
 * una richiesta agganciata, quindi la seconda chiamata non muove niente.
 */
export const procedura = definisci({
  nome: 'smistamento.pdf.attribuisci',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Dice di quale classe è un PDF, e rifà la bozza con i nomi nuovi',
  azione: 'smistamento.attribuisci',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    classeId: identificatore({ aiuto: 'La classe a cui passa quel che resta da decidere' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    esigiClasse(ambito, ingresso.classeId)
    return daGestore(smistamento['smistamento.attribuisci'], (i: typeof ingresso) => ({
      tipo: 'smistamento.attribuisci' as const, ...i,
    }))(ambito, ingresso)
  },
})

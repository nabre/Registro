import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../../common/register.js'
import { esigiSmistamento } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pdf.attribuisci

/**
 * Di quale classe è un PDF. Idempotente: con la classe già quella e nessuna
 * richiesta agganciata il gestore non muove niente.
 */
export const procedura = scrittura({
  nome: 'smistamento.pdf.attribuisci',
  titolo: () => t().titolo,
  azione: 'smistamento.attribuisci',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    classeId: identificatore({ aiuto: () => t().classeId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    esigiClasse(ambito, ingresso.classeId, null)
    return inoltra(smistamento, 'smistamento.attribuisci')(ambito, ingresso)
  },
})

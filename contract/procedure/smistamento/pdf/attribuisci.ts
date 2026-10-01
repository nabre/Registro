import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { esigiSmistamento } from '#contract/procedure/smistamento/common.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

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
    esigiClasse(ambito, ingresso.classeId)
    return inoltra(smistamento, 'smistamento.attribuisci')(ambito, ingresso)
  },
})

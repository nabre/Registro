import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiSmistamento } from '#contract/procedure/smistamento/common.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().bozza.conferma

/**
 * Tutta la bozza in un gesto. Non idempotente: ogni riga con un nome diventa
 * un documento, e al secondo giro «Non c'è nessuna proposta da confermare».
 */
export const procedura = scrittura({
  nome: 'smistamento.bozza.conferma',
  titolo: () => t().titolo,
  azione: 'smistamento.confermaTutto',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.confermaTutto')(ambito, ingresso)
  },
})

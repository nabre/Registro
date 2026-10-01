import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiSmistamento } from '#contract/procedure/smistamento/common.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().lettura.tutto

/** Tutte le pagine mute di un PDF, in coda. */
export const procedura = scrittura({
  nome: 'smistamento.lettura.tutto',
  titolo: () => t().titolo,
  azione: 'smistamento.leggiTutto',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.leggiTutto')(ambito, ingresso)
  },
})

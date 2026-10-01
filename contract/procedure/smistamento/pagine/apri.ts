import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiSmistamento, pagine } from '#contract/procedure/smistamento/common.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().pagine.apri

/**
 * Solo quelle pagine, ritagliate e aperte nel lettore. Non idempotente: ogni
 * chiamata scrive un ritaglio nuovo fra le copie di servizio del deposito.
 */
export const procedura = scrittura({
  nome: 'smistamento.pagine.apri',
  titolo: () => t().titolo,
  azione: 'smistamento.apriPagine',
  idempotente: false,
  collezioni: [],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine(),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.apriPagine')(ambito, ingresso)
  },
})

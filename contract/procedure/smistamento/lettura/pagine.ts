import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiSmistamento, pagine } from '#contract/procedure/smistamento/common.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().lettura.pagine

/** Le pagine scelte, rimesse in coda alla lettura. */
export const procedura = scrittura({
  nome: 'smistamento.lettura.pagine',
  titolo: () => t().titolo,
  azione: 'smistamento.leggiPagine',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine(),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.leggiPagine')(ambito, ingresso)
  },
})

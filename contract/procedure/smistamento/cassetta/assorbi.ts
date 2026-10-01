import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { oggetto, testo } from '#contract/schemas.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().cassetta.assorbi

/**
 * Assorbe un singolo file PDF dalla cassetta di arrivo nel documento corrente.
 * Spezzata per singolo file per non superare il tempo massimo della fila di scrittura.
 */
export const procedura = scrittura({
  nome: 'smistamento.cassetta.assorbi',
  titolo: () => t().titolo,
  azione: 'smistamento.cassetta.assorbi',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    percorso: testo({ aiuto: () => t().percorso }),
  }),
  esegui: inoltra(smistamento, 'smistamento.cassetta.assorbi'),
})

import { smistamento } from '#core/azioni/sorting.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiSmistamento } from '#contract/procedure/smistamento/common.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().pdf.elimina

/**
 * Via il PDF e la riga che lo aspettava. Idempotente rispetto al registro. Il
 * PDF sta nel documento dell'anno e non passa dal cestino: `cestina` vale solo
 * per i file fuori dal documento (vedi `actions/context.ts`).
 */
export const procedura = scrittura({
  nome: 'smistamento.pdf.elimina',
  titolo: () => t().titolo,
  azione: 'smistamento.elimina',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.elimina')(ambito, ingresso)
  },
})

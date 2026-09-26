import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pdf.apri

/**
 * Il PDF originale aperto nel lettore del sistema. Non tocca il registro, ma
 * resta `scrittura`: apre una finestra, e non va chiamata per sapere qualcosa.
 */
export const procedura = scrittura({
  nome: 'smistamento.pdf.apri',
  titolo: () => t().titolo,
  azione: 'smistamento.apri',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ smistamentoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.apri')(ambito, ingresso)
  },
})

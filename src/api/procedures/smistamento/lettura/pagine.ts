import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'
import { testi } from '../smistamento.testi.js'

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

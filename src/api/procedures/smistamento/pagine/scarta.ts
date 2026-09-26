import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pagine.scarta

/**
 * Le pagine buttate via. Idempotente: le stesse pagine sono già uscite dalle
 * letture. Se la prima volta ha chiuso lo smistamento, la seconda risponde che
 * non c'è più.
 */
export const procedura = scrittura({
  nome: 'smistamento.pagine.scarta',
  titolo: () => t().titolo,
  azione: 'smistamento.scartaPagine',
  idempotente: true,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    pagine: pagine(),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.scartaPagine')(ambito, ingresso)
  },
})

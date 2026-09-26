import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().firme.assegna

/**
 * Le pagine archiviate come foglio firme di una richiesta. Non idempotente: la
 * seconda volta la richiesta «ha già il foglio».
 */
export const procedura = scrittura({
  nome: 'smistamento.firme.assegna',
  titolo: () => t().titolo,
  azione: 'smistamento.assegnaFirme',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    consegnaId: identificatore({ aiuto: () => t().consegnaId }),
    pagine: pagine(),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.assegnaFirme')(ambito, ingresso)
  },
})

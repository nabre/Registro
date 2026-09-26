import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagina } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pagine.assegnaManuale

/**
 * L'assegnazione a mano, per estremi. Legacy come `smistamento.pdf.dividi`:
 * nessuna vista la manda, la usano le prove.
 *
 * `da` e `a` non si confrontano qui: un intervallo alla rovescia lo rifiuta lo
 * smistatore, che sa anche quante pagine ha il PDF. Non idempotente: la
 * seconda volta «ha già un documento».
 */
export const procedura = scrittura({
  nome: 'smistamento.pagine.assegnaManuale',
  titolo: () => t().titolo,
  azione: 'smistamento.assegnaManuale',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    consegnaId: identificatore({ aiuto: () => t().consegnaId }),
    allievoId: identificatore(),
    da: pagina(),
    a: pagina(),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.assegnaManuale')(ambito, ingresso)
  },
})

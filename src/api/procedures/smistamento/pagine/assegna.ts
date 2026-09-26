import { smistamento } from '../../../../actions/sorting.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiSmistamento, pagine } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().pagine.assegna

/**
 * Le pagine trascinate sulla casella di una persona: ritaglia un PDF nel
 * fascicolo, spunta la richiesta, toglie le pagine dalle letture. Non
 * idempotente: la seconda volta «ha già un documento».
 *
 * La richiesta la controlla il gestore, con la sua frase.
 */
export const procedura = scrittura({
  nome: 'smistamento.pagine.assegna',
  titolo: () => t().titolo,
  azione: 'smistamento.assegnaPagine',
  idempotente: false,
  collezioni: ['consegne', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    consegnaId: identificatore(),
    allievoId: identificatore(),
    pagine: pagine(),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    return inoltra(smistamento, 'smistamento.assegnaPagine')(ambito, ingresso)
  },
})

import { consegne } from '../../../actions/assignments.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, identificatore, oggetto } from '../../schemas.js'
import { esigiConsegna } from './common.js'
import { testi } from './consegne.testi.js'

const t = () => testi().consegnato

export const procedura = scrittura({
  nome: 'consegne.consegnato',
  titolo: () => t().titolo,
  azione: 'consegna.consegnato',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: identificatore({ aiuto: () => t().allievoId }),
    fatta: booleano({ aiuto: () => t().fatta }),
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.consegnato')(ambito, ingresso)
  },
})

import { consegne } from '../../../actions/assignments.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, identificatore, oggetto } from '../../schemas.js'
import { esigiConsegna } from './common.js'
import { testi } from './consegne.testi.js'

const t = () => testi().spuntaTutti

export const procedura = scrittura({
  nome: 'consegne.spuntaTutti',
  titolo: () => t().titolo,
  azione: 'consegna.spuntaTutti',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    fatta: booleano({ aiuto: () => t().fatta }),
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.spuntaTutti')(ambito, ingresso)
  },
})

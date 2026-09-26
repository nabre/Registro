import { consegne } from '../../../actions/assignments.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiConsegna } from './common.js'
import { testi } from './consegne.testi.js'

export const procedura = scrittura({
  nome: 'consegne.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'consegna.elimina',
  // Al secondo giro la consegna non c'è più, e lo si dice.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({ consegnaId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.elimina')(ambito, ingresso)
  },
})

import { consegne } from '../../../actions/assignments.js'
import { inoltra, scrittura } from '../../core.js'
import { booleano, identificatore, oggetto } from '../../schemas.js'
import { chiSpunta, esigiConsegna } from './common.js'
import { testi } from './consegne.testi.js'

const t = () => testi().spunta

export const procedura = scrittura({
  nome: 'consegne.spunta',
  titolo: () => t().titolo,
  azione: 'consegna.spunta',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiSpunta,
    fatta: booleano({ aiuto: () => t().fatta }),
  }),
  esegui: (ambito, ingresso) => {
    // Che una spunta con un documento raccolto non si tolga lo dice il gestore:
    // è un rifiuto, non un «non c'è».
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.spunta')(ambito, ingresso)
  },
})

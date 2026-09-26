import { ore } from '../../../actions/hours.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, oggetto, opzionale, ora } from '../../schemas.js'
import { esigiLezione } from './common.js'
import { testi } from './ore.testi.js'

const t = () => testi().sposta

export const procedura = scrittura({
  nome: 'ore.sposta',
  titolo: () => t().titolo,
  azione: 'lezione.sposta',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    data: iso({ aiuto: () => t().data }),
    inizio: opzionale(ora({
      aiuto: () => t().inizio,
    })),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'lezione.sposta')(ambito, ingresso)
  },
})

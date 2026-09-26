import { ore } from '../../../actions/hours.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, oggetto, opzionale, ora } from '../../schemas.js'
import { esigiLezione } from './common.js'
import { testi } from './ore.testi.js'

const t = () => testi().duplica

export const procedura = scrittura({
  nome: 'ore.duplica',
  titolo: () => t().titolo,
  azione: 'lezione.duplica',
  // Ogni chiamata crea un'ora nuova: ritentare dopo un guasto di trasporto la
  // raddoppia.
  idempotente: false,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore({ aiuto: () => t().lezioneId }),
    data: iso({ aiuto: () => t().data }),
    inizio: opzionale(ora({
      aiuto: () => t().inizio,
    })),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'lezione.duplica')(ambito, ingresso)
  },
})

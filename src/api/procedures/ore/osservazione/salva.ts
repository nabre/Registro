import { ore } from '../../../../actions/hours.js'
import { Uno } from '../../../../domain/lexicon.js'
import { lessico } from '../../../../domain/lexicon.testi.js'
import type { Osservazione } from '../../../../domain/models.js'
import { inoltra, scrittura } from '../../../core.js'
import { entita, identificatore, oggetto } from '../../../schemas.js'
import { esigiLezione } from '../common.js'
import { testi } from '../ore.testi.js'

const t = () => testi().osservazione.salva

export const procedura = scrittura({
  nome: 'ore.osservazione.salva',
  titolo: () => t().titolo,
  azione: 'osservazione.salva',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    // Senza `valida`: l'unica regola (testo non vuoto) sta nel gestore; qui solo
    // la forma.
    osservazione: entita<Osservazione>({
      cosa: () => Uno(lessico().osservazione),
      aiuto: () => t().osservazione,
    }),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return inoltra(ore, 'osservazione.salva')(ambito, ingresso)
  },
})

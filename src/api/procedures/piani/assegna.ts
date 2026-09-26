import { piani } from '../../../actions/plans.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiLezione, esigiPiano } from '../common/plans.js'
import { testi } from './piani.testi.js'

const t = () => testi().assegna

export const procedura = scrittura({
  nome: 'piani.assegna',
  titolo: () => t().titolo,
  azione: 'piano.assegna',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    // Obbligatorio e annullabile: `null` è il gesto di staccare il piano.
    pianoId: nullabile(identificatore({ aiuto: () => t().pianoId })),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    // Due «non trovato» distinti, l'ora e il piano: due rimedi diversi.
    if (ingresso.pianoId) esigiPiano(ambito, ingresso.pianoId)
    return inoltra(piani, 'piano.assegna')(ambito, ingresso)
  },
})

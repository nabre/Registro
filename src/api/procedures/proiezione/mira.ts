import { proiezione } from '../../../actions/projection.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, nullabile, oggetto } from '../../schemas.js'
import { testi } from './proiezione.testi.js'

export const procedura = scrittura({
  nome: 'proiezione.mira',
  titolo: () => testi().mira.titolo,
  azione: 'proiezione.mira',
  idempotente: true,
  collezioni: [],
  // Cinque riferimenti richiesti e nullabili, come `MiraProiezione`: `null` vuol
  // dire «non c'è».
  ingresso: oggetto({
    mira: oggetto({
      lezioneId: nullabile(identificatore()),
      corsoId: nullabile(identificatore()),
      classeId: nullabile(identificatore()),
      semestreId: nullabile(identificatore()),
      data: nullabile(iso({ aiuto: () => testi().mira.data })),
    }),
  }),
  esegui: inoltra(proiezione, 'proiezione.mira'),
})

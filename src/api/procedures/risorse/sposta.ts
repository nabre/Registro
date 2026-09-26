import { piani } from '../../../actions/plans.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'
import { testi } from './risorse.testi.js'

const t = () => testi().sposta

export const procedura = scrittura({
  nome: 'risorse.sposta',
  titolo: () => t().titolo,
  azione: 'risorsa.sposta',
  // Rinomina il file invece di copiarlo: la seconda chiamata trova la risorsa già
  // arrivata.
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    daAttivitaId: nullabile(identificatore({ aiuto: () => t().daAttivitaId })),
    aAttivitaId: nullabile(identificatore({ aiuto: () => t().aAttivitaId })),
    risorsaId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    // Stesso ordine del gestore: partenza e arrivo uguali rispondono «fatto», e chi
    // lascia cadere una risorsa dov'era non deve ricevere un errore.
    if (ingresso.daAttivitaId !== ingresso.aAttivitaId) {
      esigiTappa(piano, ingresso.aAttivitaId)
      esigiRisorsa(piano, ingresso.daAttivitaId, ingresso.risorsaId)
    }
    return inoltra(piani, 'risorsa.sposta')(ambito, ingresso)
  },
})

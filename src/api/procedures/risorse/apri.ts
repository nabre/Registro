import { piani } from '../../../actions/plans.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'
import { testi } from './risorse.testi.js'

export const procedura = scrittura({
  nome: 'risorse.apri',
  titolo: () => testi().apri.titolo,
  azione: 'risorsa.apri',
  idempotente: true,
  // `scrittura` con `collezioni` vuoto: non cambia il registro, ma apre una
  // finestra o fa partire un programma.
  collezioni: [],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore()),
    risorsaId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    esigiTappa(piano, ingresso.attivitaId)
    esigiRisorsa(piano, ingresso.attivitaId, ingresso.risorsaId)
    return inoltra(piani, 'risorsa.apri')(ambito, ingresso)
  },
})

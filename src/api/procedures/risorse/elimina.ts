import { piani } from '../../../actions/plans.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'
import { testi } from './risorse.testi.js'

export const procedura = scrittura({
  nome: 'risorse.elimina',
  titolo: () => testi().elimina.titolo,
  azione: 'risorsa.elimina',
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore()),
    risorsaId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    esigiTappa(piano, ingresso.attivitaId)
    // La frase del gestore, ma con il codice `non-trovato`: dice a chi chiama se
    // rileggere.
    esigiRisorsa(piano, ingresso.attivitaId, ingresso.risorsaId)
    return inoltra(piani, 'risorsa.elimina')(ambito, ingresso)
  },
})

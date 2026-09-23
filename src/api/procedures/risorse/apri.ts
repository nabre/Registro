import { piani } from '../../../actions/plans.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'

export const procedura = definisci({
  nome: 'risorse.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre la risorsa: il collegamento nel browser, il file col programma di sistema',
  azione: 'risorsa.apri',
  idempotente: true,
  // Scrittura con `collezioni` vuoto, e non una lettura: del registro non
  // cambia una riga, ma fa succedere qualcosa fuori — si apre una finestra,
  // parte un programma. Una lettura del registro non ha effetti, mai, e
  // chiamarla così direbbe a chi chiama che è innocua da rifare a vuoto.
  collezioni: [],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore()),
    risorsaId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    esigiTappa(piano, ingresso.attivitaId)
    esigiRisorsa(piano, ingresso.attivitaId, ingresso.risorsaId)
    return daGestore(piani['risorsa.apri'], (i: typeof ingresso) => ({
      tipo: 'risorsa.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

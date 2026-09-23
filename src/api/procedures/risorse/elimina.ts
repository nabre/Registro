import { piani } from '../../../actions/plans.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'

export const procedura = definisci({
  nome: 'risorse.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie una risorsa dal piano, e il suo file dalla cartella',
  azione: 'risorsa.elimina',
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore()),
    risorsaId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    esigiTappa(piano, ingresso.attivitaId)
    // Il gestore diceva «Risorsa non trovata» con un rifiuto: la frase resta
    // quella, il codice no — ed è il codice a dire a chi chiama da fuori se
    // conviene rileggere o arrendersi.
    esigiRisorsa(piano, ingresso.attivitaId, ingresso.risorsaId)
    return daGestore(piani['risorsa.elimina'], (i: typeof ingresso) => ({
      tipo: 'risorsa.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

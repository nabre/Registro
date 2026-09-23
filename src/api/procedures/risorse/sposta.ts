import { piani } from '../../../actions/plans.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'

export const procedura = definisci({
  nome: 'risorse.sposta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'La risorsa passa a un’altra tappa, o al piano nel suo insieme',
  azione: 'risorsa.sposta',
  // Rinomina il file invece di copiarlo: rifarla non moltiplica niente, e la
  // seconda chiamata trova la risorsa già arrivata dov'era diretta.
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    daAttivitaId: nullabile(identificatore({ aiuto: 'Dov’è adesso; null: nel piano' })),
    aAttivitaId: nullabile(identificatore({ aiuto: 'Dove va; null: nel piano' })),
    risorsaId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    // Nello stesso ordine del gestore, e non è pedanteria: partenza e arrivo
    // uguali sono un non-spostamento che oggi risponde «fatto», e una guardia
    // davanti lo farebbe fallire a chi trascina una risorsa e la lascia cadere
    // dov'era.
    if (ingresso.daAttivitaId !== ingresso.aAttivitaId) {
      esigiTappa(piano, ingresso.aAttivitaId)
      esigiRisorsa(piano, ingresso.daAttivitaId, ingresso.risorsaId)
    }
    return daGestore(piani['risorsa.sposta'], (i: typeof ingresso) => ({
      tipo: 'risorsa.sposta' as const, ...i,
    }))(ambito, ingresso)
  },
})

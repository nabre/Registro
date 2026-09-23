import { piani } from '../../../actions/plans.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiLezione, esigiPiano } from '../common/plans.js'

export const procedura = definisci({
  nome: 'piani.assegna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Aggancia un piano a un’ora, o lo stacca',
  azione: 'piano.assegna',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    // Obbligatorio e annullabile — non facoltativo: `null` è il gesto di
    // staccare il piano, e un campo assente non vuol dire quello.
    pianoId: nullabile(identificatore({ aiuto: 'null stacca il piano dall’ora' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    // Due «non trovato» distinti, l'ora e il piano: da fuori sono due rimedi
    // diversi, e una frase sola li confonderebbe.
    if (ingresso.pianoId) esigiPiano(ambito, ingresso.pianoId)
    return daGestore(piani['piano.assegna'], (i: typeof ingresso) => ({
      tipo: 'piano.assegna' as const, ...i,
    }))(ambito, ingresso)
  },
})

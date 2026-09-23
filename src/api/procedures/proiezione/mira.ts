import { proiezione } from '../../../actions/projection.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, iso, nullabile, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'proiezione.mira',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Dice alla proiezione dove sta guardando il registro',
  azione: 'proiezione.mira',
  idempotente: true,
  collezioni: [],
  // Cinque riferimenti, tutti richiesti e tutti nullabili: è la forma esatta di
  // `MiraProiezione`, dove `null` vuol dire «non c'è», non «non lo dico».
  ingresso: oggetto({
    mira: oggetto({
      lezioneId: nullabile(identificatore()),
      corsoId: nullabile(identificatore()),
      classeId: nullabile(identificatore()),
      semestreId: nullabile(identificatore()),
      data: nullabile(iso({ aiuto: 'Il giorno mostrato: vale quando non c’è un’ora aperta' })),
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(proiezione['proiezione.mira'], (i: typeof ingresso) => ({
      tipo: 'proiezione.mira' as const, ...i,
    }))(ambito, ingresso),
})

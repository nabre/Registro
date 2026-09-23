import { docenteClasse } from '../../../../../actions/classTeacher.js'
import { definisci } from '../../../../contract.js'
import { daGestore, SCRITTURA } from '../../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../../schemas.js'
import { esigiAllievo, esigiBlocco, GENERI_RAPPORTO } from '../../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.foglio.aggiungi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Aggiunge un foglio alla riga di una persona: vergine o firmato',
  azione: 'assenze.foglio.aggiungi',
  // Lo stesso foglio ricaricato — una scansione migliore — sostituisce quello
  // che c'era nella stessa casella, invece di accumulare copie.
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    allievoId: identificatore({ aiuto: 'Di chi è il foglio' }),
    genere: scelta(GENERI_RAPPORTO, { aiuto: 'Che cosa racconta il foglio' }),
    firmato: booleano({ aiuto: 'Vero è quello tornato indietro con la firma sopra' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    esigiAllievo(ambito, ingresso.classeId, ingresso.allievoId)
    return daGestore(docenteClasse['assenze.foglio.aggiungi'], (i: typeof ingresso) => ({
      tipo: 'assenze.foglio.aggiungi' as const, ...i,
    }))(ambito, ingresso)
  },
})

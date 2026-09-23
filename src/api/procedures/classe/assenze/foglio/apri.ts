import { docenteClasse } from '../../../../../actions/classTeacher.js'
import { definisci } from '../../../../contract.js'
import { daGestore, SCRITTURA } from '../../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../../schemas.js'
import { esigiBlocco, GENERI_RAPPORTO } from '../../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.foglio.apri',
  versione: 1,
  // Apre un documento con il programma del sistema: del registro non cambia
  // niente — `collezioni` resta vuoto — ma è un effetto sul mondo, e il canale
  // delle domande salta apposta la coda delle scritture. Una procedura
  // raggiungibile di là dev'essere innocua davvero, non quasi.
  genere: 'scrittura',
  titolo: 'Apre un foglio di assenze nel programma del sistema',
  azione: 'assenze.foglio.apri',
  idempotente: true,
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    allievoId: identificatore(),
    genere: scelta(GENERI_RAPPORTO),
    firmato: booleano(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    // Sulla riga non c'è guardia: chi non ha mancato un'ora non ha una riga nel
    // periodo, ed è un caso normale — «nessun foglio da aprire» lo dice il
    // gestore, che è l'unico a sapere quale delle quattro caselle si guardava.
    return daGestore(docenteClasse['assenze.foglio.apri'], (i: typeof ingresso) => ({
      tipo: 'assenze.foglio.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

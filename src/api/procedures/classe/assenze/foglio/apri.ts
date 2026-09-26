import { docenteClasse } from '../../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../../schemas.js'
import { esigiBlocco, GENERI_RAPPORTO } from '../../common.js'
import { testi } from '../../classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.assenze.foglio.apri',
  // Apre un documento con il programma del sistema: non cambia il registro
  // (`collezioni` vuoto), ma è un effetto sul mondo. Il canale delle domande
  // salta la coda delle scritture, e ciò che ci passa deve essere innocuo.
  titolo: () => testi().assenze.foglio.apri.titolo,
  azione: 'assenze.foglio.apri',
  idempotente: true,
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    allievoId: identificatore(),
    genere: scelta(GENERI_RAPPORTO),
    firmato: booleano(),
  }),
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    // Nessuna guardia sulla riga: chi non ha mancato ore non ne ha una, ed è
    // normale. «Nessun foglio da aprire» lo dice il gestore.
    return inoltra(docenteClasse, 'assenze.foglio.apri')(ambito, ingresso)
  },
})

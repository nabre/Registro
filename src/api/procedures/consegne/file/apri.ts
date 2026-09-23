import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { chiRiguarda, esigiConsegna } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.file.apri',
  versione: 1,
  // Apre un documento con il programma del sistema: del registro non cambia
  // niente — `collezioni` resta vuoto — ma è un effetto sul mondo, e il canale
  // delle domande salta apposta la coda delle scritture. Una procedura
  // raggiungibile di là dev'essere innocua davvero, non quasi.
  genere: 'scrittura',
  titolo: 'Apre il documento che tocca a una persona in una consegna',
  azione: 'consegna.file.apri',
  idempotente: true,
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiRiguarda('Chi riguarda il documento: una persona, o «docente» per la copia a sé'),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    // Che quel documento esista lo dice il gestore, con `documentoPer`: c'è il
    // caso del file unico per tutti, e ripetere qui quella regola vorrebbe dire
    // averne due da tenere allineate.
    return daGestore(docenteClasse['consegna.file.apri'], (i: typeof ingresso) => ({
      tipo: 'consegna.file.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

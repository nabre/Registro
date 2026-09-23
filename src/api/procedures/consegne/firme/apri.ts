import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.firme.apri',
  versione: 1,
  // Apre un documento nel programma del sistema: del registro non tocca
  // niente, e dopo non c'è nessuno stato da rispingere.
  // Apre un documento con il programma del sistema: del registro non cambia
  // niente — `collezioni` resta vuoto — ma è un effetto sul mondo, e il canale
  // delle domande salta apposta la coda delle scritture. Una procedura
  // raggiungibile di là dev'essere innocua davvero, non quasi.
  genere: 'scrittura',
  titolo: 'Apre il foglio firme di una consegna',
  azione: 'consegna.firme.apri',
  idempotente: true,
  ingresso: oggetto({
    consegnaId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(docenteClasse['consegna.firme.apri'], (i: typeof ingresso) => ({
      tipo: 'consegna.firme.apri' as const, ...i,
    }))(ambito, ingresso)
  },
})

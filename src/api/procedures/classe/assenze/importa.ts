import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiBlocco, GENERI_RAPPORTO } from '../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.importa',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Importa una cartella di fogli e li assegna dal nome del file',
  azione: 'assenze.importa',
  /**
   * Fino a venticinque PDF letti da una cartella, riconosciuti dal nome.
   *
   * Non è idempotente e non lo sarebbe nemmeno dichiarandolo: quel che entra
   * dipende dai file scelti nella finestra, non dall'ingresso, e un giro può
   * finire a metà — alcuni assegnati, altri rimasti fuori. Ritentarlo alla
   * cieca dopo un errore di trasporto vuol dire rifare una scelta di file, non
   * ripetere la stessa scrittura.
   */
  idempotente: false,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    genere: scelta(GENERI_RAPPORTO),
    firmato: booleano(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return daGestore(docenteClasse['assenze.importa'], (i: typeof ingresso) => ({
      tipo: 'assenze.importa' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiBlocco, GENERI_RAPPORTO } from '../common.js'
import { testi } from '../classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.assenze.importa',
  titolo: () => testi().assenze.importa.titolo,
  azione: 'assenze.importa',
  /**
   * Fino a venticinque PDF da una cartella, riconosciuti dal nome. Non
   * idempotente: dipende dai file scelti nella finestra, e un giro può finire a
   * metà.
   */
  idempotente: false,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    genere: scelta(GENERI_RAPPORTO),
    firmato: booleano(),
  }),
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return inoltra(docenteClasse, 'assenze.importa')(ambito, ingresso)
  },
})

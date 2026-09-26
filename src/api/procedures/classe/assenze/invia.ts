import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { elenco, identificatore, oggetto } from '../../../schemas.js'
import { esigiBlocco } from '../common.js'
import { testi } from '../classe.testi.js'

const t = () => testi().assenze.invia

export const procedura = scrittura({
  nome: 'classe.assenze.invia',
  titolo: () => t().titolo,
  azione: 'assenze.invia',
  /**
   * Manda e-mail, una per persona, con i fogli. Il gestore segna riga per riga
   * com'è andata, ma con `allieviIds` pieno si rispedisce anche a chi aveva già
   * ricevuto, e le bozze solo preparate non lasciano traccia.
   */
  idempotente: false,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    // Obbligatorio come nel protocollo: l'elenco vuoto vuol già dire «tutti quelli
    // pronti e non ancora spediti».
    allieviIds: elenco(identificatore(), { aiuto: () => t().allieviIds }),
  }),
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return inoltra(docenteClasse, 'assenze.invia')(ambito, ingresso)
  },
})

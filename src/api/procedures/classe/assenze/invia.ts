import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { elenco, identificatore, oggetto } from '../../../schemas.js'
import { esigiBlocco } from '../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.invia',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Prepara e manda le richieste di firma: una e-mail per persona',
  azione: 'assenze.invia',
  /**
   * Manda e-mail, una per persona, con i fogli in chiaro dentro.
   *
   * Il gestore si difende scrivendo riga per riga com'è andata — così un giro
   * ripetuto riparte da chi non era partito — ma con `allieviIds` pieno si
   * rispedisce anche a chi aveva già ricevuto, e le bozze soltanto preparate
   * non lasciano traccia. Chi chiama da fuori deve saperlo prima di ritentare.
   */
  idempotente: false,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    // Obbligatorio e non facoltativo, come nel protocollo: l'elenco vuoto ha
    // già un significato suo — «tutti quelli pronti e non ancora spediti» — e
    // farlo mancare vorrebbe dire due modi di dire la stessa cosa.
    allieviIds: elenco(identificatore(), {
      aiuto: 'Vuoto vuol dire: tutti quelli pronti e non ancora spediti',
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    return daGestore(docenteClasse['assenze.invia'], (i: typeof ingresso) => ({
      tipo: 'assenze.invia' as const, ...i,
    }))(ambito, ingresso)
  },
})

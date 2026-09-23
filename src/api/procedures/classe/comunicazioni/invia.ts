import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiComunicazione } from '../common.js'

export const procedura = definisci({
  nome: 'classe.comunicazioni.invia',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Manda la comunicazione ai destinatari, in copia nascosta',
  azione: 'comunicazione.invia',
  /**
   * Manda e-mail: rifarla dopo un errore di trasporto vuol dire mandarle due
   * volte. Il gestore ha la sua difesa — una comunicazione già `inviata` viene
   * rifiutata — ma una bozza aperta nel programma di posta e non ancora
   * spedita non lascia nessun segno, e lì la seconda chiamata riparte davvero.
   */
  idempotente: false,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazioneId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiComunicazione(ambito, ingresso.classeId, ingresso.comunicazioneId)
    return daGestore(docenteClasse['comunicazione.invia'], (i: typeof ingresso) => ({
      tipo: 'comunicazione.invia' as const, ...i,
    }))(ambito, ingresso)
  },
})

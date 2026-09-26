import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiComunicazione } from '../common.js'
import { testi } from '../classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.comunicazioni.invia',
  titolo: () => testi().comunicazioni.invia.titolo,
  azione: 'comunicazione.invia',
  /**
   * Manda e-mail: ritentare le manda due volte. Il gestore rifiuta una
   * comunicazione già `inviata`, ma una bozza aperta e non spedita non lascia
   * segno.
   */
  idempotente: false,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazioneId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiComunicazione(ambito, ingresso.classeId, ingresso.comunicazioneId)
    return inoltra(docenteClasse, 'comunicazione.invia')(ambito, ingresso)
  },
})

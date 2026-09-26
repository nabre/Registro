import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../../common/register.js'
import { testi } from '../classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.comunicazioni.elimina',
  titolo: () => testi().comunicazioni.elimina.titolo,
  azione: 'comunicazione.elimina',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazioneId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    // Guardia sulla sola classe: una comunicazione già sparita è la cosa voluta.
    esigiClasse(ambito, ingresso.classeId, null)
    return inoltra(docenteClasse, 'comunicazione.elimina')(ambito, ingresso)
  },
})

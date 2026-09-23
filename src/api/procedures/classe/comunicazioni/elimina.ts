import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../common.js'

export const procedura = definisci({
  nome: 'classe.comunicazioni.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Butta via una comunicazione dal fascicolo',
  azione: 'comunicazione.elimina',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazioneId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Qui la guardia è sulla sola classe: eliminare una comunicazione già
    // sparita è la cosa voluta, e rifiutarla renderebbe la seconda chiamata un
    // errore là dove il registro è già come lo si vuole.
    esigiClasse(ambito, ingresso.classeId)
    return daGestore(docenteClasse['comunicazione.elimina'], (i: typeof ingresso) => ({
      tipo: 'comunicazione.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

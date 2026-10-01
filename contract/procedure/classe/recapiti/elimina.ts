import { docenteClasse } from '#core/azioni/classTeacher.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { testi } from '#contract/procedure/classe/classe.testi.js'

export const procedura = scrittura({
  nome: 'classe.recapiti.elimina',
  titolo: () => testi().recapiti.elimina.titolo,
  azione: 'recapito.elimina',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    recapitoId: identificatore(),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    // Nessuna guardia sul `recapitoId`: il lessico non ha un termine per
    // «recapito», e toglierne uno che non c'è è comunque la cosa voluta.
    return inoltra(docenteClasse, 'recapito.elimina')(ambito, ingresso)
  },
})

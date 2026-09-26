import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna } from '../common.js'
import { testi } from '../consegne.testi.js'

const t = () => testi().firme.aggiungi

export const procedura = scrittura({
  nome: 'consegne.firme.aggiungi',
  titolo: () => t().titolo,
  azione: 'consegna.firme.aggiungi',
  // Il file scelto sostituisce quello nella stessa casella (`archiviaCopia` con
  // `sostituibile`): rifarlo lascia un foglio firme solo.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore({ aiuto: () => t().consegnaId }),
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(docenteClasse, 'consegna.firme.aggiungi')(ambito, ingresso)
  },
})

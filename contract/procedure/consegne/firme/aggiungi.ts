import { docenteClasse } from '#core/azioni/classTeacher.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto, opzionale, testo } from '#contract/schemas.js'
import { esigiConsegna } from '#contract/procedure/consegne/common.js'
import { testi } from '#contract/procedure/consegne/consegne.testi.js'

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
    file: opzionale(testo({ aiuto: () => t().file })),
  }),
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(docenteClasse, 'consegna.firme.aggiungi')(ambito, ingresso)
  },
})

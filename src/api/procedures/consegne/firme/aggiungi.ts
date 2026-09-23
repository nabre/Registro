import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.firme.aggiungi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Allega il foglio firmato da chi ha ritirato il documento',
  azione: 'consegna.firme.aggiungi',
  // Il file scelto sostituisce quello che c'era nella stessa casella — è quel
  // che fa `archiviaCopia` con `sostituibile` — quindi rifarlo lascia la
  // consegna con un foglio firme solo, non con due copie.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore({ aiuto: 'La consegna a cui si appende il foglio' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(docenteClasse['consegna.firme.aggiungi'], (i: typeof ingresso) => ({
      tipo: 'consegna.firme.aggiungi' as const, ...i,
    }))(ambito, ingresso)
  },
})

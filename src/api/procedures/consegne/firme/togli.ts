import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.firme.togli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Manda nel cestino il foglio firme e lo toglie dalla consegna',
  azione: 'consegna.firme.togli',
  // Al secondo colpo il gestore rifiuta — il foglio non c'è più — ma il
  // registro resta quello del primo: è l'idempotenza che il contratto chiede.
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(docenteClasse['consegna.firme.togli'], (i: typeof ingresso) => ({
      tipo: 'consegna.firme.togli' as const, ...i,
    }))(ambito, ingresso)
  },
})

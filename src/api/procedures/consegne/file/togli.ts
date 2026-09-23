import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { chiRiguarda, esigiConsegna } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.file.togli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie il documento di una persona e la sua spunta: torna atteso',
  azione: 'consegna.file.togli',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    chi: chiRiguarda('Chi riguarda il documento da togliere'),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(docenteClasse['consegna.file.togli'], (i: typeof ingresso) => ({
      tipo: 'consegna.file.togli' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { consegne } from '../../../../actions/assignments.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiConsegna, perChi } from '../common.js'

export const procedura = definisci({
  nome: 'consegne.documento.togli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie il documento pronto e lo mette nel cestino del sistema',
  azione: 'consegna.documento.togli',
  idempotente: true,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: perChi,
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.documento.togli'], (i: typeof ingresso) => ({
      tipo: 'consegna.documento.togli' as const, ...i,
    }))(ambito, ingresso)
  },
})

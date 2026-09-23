import { registro } from '../../../../actions/register.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiPersona } from '../common.js'

export const procedura = definisci({
  nome: 'persone.foto.togli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Via il ritratto dall’anagrafica, e via il file',
  azione: 'allievo.foto.togli',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiPersona(ambito, ingresso.classeId, ingresso.allievoId)
    return daGestore(registro['allievo.foto.togli'], (i: typeof ingresso) => ({
      tipo: 'allievo.foto.togli' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiPersona } from './common.js'

export const procedura = definisci({
  nome: 'persone.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie una persona dalla classe con presenze, voti e osservazioni',
  azione: 'allievo.elimina',
  idempotente: true,
  collezioni: ['classi', 'lezioni', 'valutazioni', 'consegne', 'fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    allievoId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiPersona(ambito, ingresso.classeId, ingresso.allievoId)
    return daGestore(registro['allievo.elimina'], (i: typeof ingresso) => ({
      tipo: 'allievo.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

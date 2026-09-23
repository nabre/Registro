import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiCorso, semestreDiEsportazione } from './common.js'

export const procedura = definisci({
  nome: 'esporta.presenze',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Le presenze di un corso in CSV, con il denominatore del PDF',
  azione: 'esporta.presenze',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    corsoId: identificatore(),
    semestreId: semestreDiEsportazione(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    return daGestore(sistema['esporta.presenze'], (i: typeof ingresso) => ({
      tipo: 'esporta.presenze' as const, ...i,
    }))(ambito, ingresso)
  },
})

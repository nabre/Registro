import { rapporti } from '../../../actions/reports.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'rapporti.modelli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre la cartella templates/ nel gestore di file del sistema',
  azione: 'rapporto.modelli',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(rapporti['rapporto.modelli'], (i: typeof ingresso) => ({
      tipo: 'rapporto.modelli' as const, ...i,
    }))(ambito, ingresso),
})

import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'posta.scollega',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie dal portachiavi quel che apre la casella: si torna alle bozze',
  azione: 'posta.scollega',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['posta.scollega'], (i: typeof ingresso) => ({
      tipo: 'posta.scollega' as const, ...i,
    }))(ambito, ingresso),
})

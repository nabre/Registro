import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'sistema.apriCartella',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mostra nel gestore file la cartella del documento',
  azione: 'sistema.apriCartella',
  // Aprire due volte la stessa cartella mostra la stessa cartella.
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['sistema.apriCartella'], (i: typeof ingresso) => ({
      tipo: 'sistema.apriCartella' as const, ...i,
    }))(ambito, ingresso),
})

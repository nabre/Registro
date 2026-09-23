import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'posta.prova',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Domanda alla casella di chi è, senza mandare niente',
  azione: 'posta.prova',
  // Bussa e chiude: si può ritentare quante volte si vuole.
  idempotente: true,
  // Il gestore torna `invariato`: non è successo niente al registro, si è solo
  // guardato fuori dalla finestra. Nessuna collezione, quindi.
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['posta.prova'], (i: typeof ingresso) => ({
      tipo: 'posta.prova' as const, ...i,
    }))(ambito, ingresso),
})

import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'posta.collega',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Collega la casella: accesso dal browser, prova, e si salva solo se il server accetta',
  azione: 'posta.collega',
  // Ricollegare una casella già collegata lascia collegata la stessa casella.
  idempotente: true,
  // Nel registro non cambia niente — il gettone va nel portachiavi del
  // sistema — ma il gestore non torna `invariato`: nello stato che il pannello
  // spinge la pastiglia «casella collegata» si accende adesso.
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['posta.collega'], (i: typeof ingresso) => ({
      tipo: 'posta.collega' as const, ...i,
    }))(ambito, ingresso),
})

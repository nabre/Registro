import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { vuoto } from '../../../schemas.js'

/**
 * Le impostazioni della lettura automatica, aperte dove sono.
 *
 * Non tocca né il registro né il disco: porta chi ha premuto davanti alle
 * impostazioni dell'applicazione, che stanno fuori dall'anno scolastico perché
 * dicono se *questa macchina* ha un OCR da usare. Come `apri`, resta
 * `scrittura` perché apre una finestra e non risponde a una domanda.
 */
export const procedura = definisci({
  nome: 'smistamento.lettura.impostazioni',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre le impostazioni sulla lettura automatica delle scansioni',
  azione: 'smistamento.impostazioni',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => daGestore(
    smistamento['smistamento.impostazioni'],
    (i: typeof ingresso) => ({ tipo: 'smistamento.impostazioni' as const, ...i }),
  )(ambito, ingresso),
})

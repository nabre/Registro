import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { vuoto } from '../../../schemas.js'

/**
 * La coda svuotata.
 *
 * Idempotente: una coda già ferma resta ferma. `collezioni` è vuoto perché
 * questa chiamata non scrive niente — semmai impedisce a quel che era in coda
 * di scrivere. `genere` resta `scrittura` lo stesso: una lettura è una domanda
 * al registro che si può rifare sempre, e questa invece ferma del lavoro.
 */
export const procedura = definisci({
  nome: 'smistamento.lettura.ferma',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Svuota la coda di lettura: quel che si sta leggendo finisce la pagina',
  azione: 'smistamento.fermaLettura',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => daGestore(
    smistamento['smistamento.fermaLettura'],
    (i: typeof ingresso) => ({ tipo: 'smistamento.fermaLettura' as const, ...i }),
  )(ambito, ingresso),
})

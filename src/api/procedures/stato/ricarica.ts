import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

/**
 * Rilegge tutto dal disco.
 *
 * `scrittura` benché non scriva niente: quel che il registro ha in mano dopo
 * non è quel che aveva prima, e chi la chiama da una riga di comando deve
 * sapere che non è una domanda innocua. Nessuna raccolta si dichiara perché
 * nessuna si riscrive: si rileggono tutte.
 */
export const procedura = definisci({
  nome: 'stato.ricarica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Rilegge il documento aperto e la cartella dei modelli',
  azione: 'stato.ricarica',
  idempotente: true,
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(registro['stato.ricarica'], (_i: typeof ingresso) => ({
      tipo: 'stato.ricarica' as const,
    }))(ambito, ingresso),
})

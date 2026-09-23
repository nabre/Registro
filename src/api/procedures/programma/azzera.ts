import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto } from '../../schemas.js'
import { chiaveProgramma } from './common.js'

export const procedura = definisci({
  nome: 'programma.azzera',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Ritira il valore scritto: da lì in poi vale il predefinito del manifesto',
  azione: 'programma.azzera',
  idempotente: true,
  collezioni: [],
  // Stessa chiave, stessa dogana: il gestore ripassa da `valoreAccettabile`
  // sul *predefinito* della voce, che è il suo modo di dire «questa chiave la
  // conosco».
  ingresso: oggetto({ chiave: chiaveProgramma() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['programma.azzera'], (i: typeof ingresso) => ({
      tipo: 'programma.azzera' as const, ...i,
    }))(ambito, ingresso),
})

import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'sistema.chiama',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Compone un numero con il programma che il sistema tiene per le chiamate',
  azione: 'sistema.chiama',
  // Ricomporre lo stesso numero è la stessa telefonata, non una seconda: nel
  // registro non resta niente, e il programma che risponde al `tel:` riapre la
  // finestra che aveva già.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    // Largo: un numero di anagrafica lo scrive una persona, con spazi, punti,
    // prefissi fra parentesi. A ridurlo a cifre e a un `+` ci pensa
    // `numeroComponibile`, che è la dogana e sta nel dominio dei telefoni.
    numero: testo({ minimo: 1, massimo: 40, aiuto: 'Il numero come sta in anagrafica' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['sistema.chiama'], (i: typeof ingresso) => ({
      tipo: 'sistema.chiama' as const, ...i,
    }))(ambito, ingresso),
})

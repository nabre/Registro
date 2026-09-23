import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'posta.invioProva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Manda una mail di prova a un indirizzo che si sceglie',
  azione: 'posta.invioProva',
  /**
   * **Questa spedisce davvero.** Non è idempotente e non lo sarà mai: due
   * chiamate sono due messaggi in una casella vera, e chi ritenta dopo un
   * errore di trasporto non sa se il primo è partito. Il registro resta
   * identico — per questo `collezioni` è vuoto — ma quel che è uscito non
   * torna indietro, e questo campo è l'unico posto in cui si può dire prima.
   */
  idempotente: false,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['posta.invioProva'], (i: typeof ingresso) => ({
      tipo: 'posta.invioProva' as const, ...i,
    }))(ambito, ingresso),
})

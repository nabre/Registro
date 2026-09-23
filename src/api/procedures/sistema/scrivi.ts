import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'sistema.scrivi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre il programma di posta su un messaggio nuovo a quell’indirizzo',
  azione: 'sistema.scrivi',
  // Apre una finestra di composizione vuota: niente parte, e riaprirla non
  // manda niente due volte.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    // Nessun modello di indirizzo qui: `indirizzoScrivibile` sa che cosa
    // accetta il `mailto:`, e un'espressione regolare scritta a mano in più
    // rifiuterebbe indirizzi buoni che oggi passano.
    indirizzo: testo({ minimo: 1, massimo: 320, aiuto: 'L’indirizzo di posta a cui scrivere' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['sistema.scrivi'], (i: typeof ingresso) => ({
      tipo: 'sistema.scrivi' as const, ...i,
    }))(ambito, ingresso),
})

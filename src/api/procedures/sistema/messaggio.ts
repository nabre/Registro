import { sistema } from '../../../actions/system.js'
import type { Messaggio } from '../../../protocol.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, scelta, testo } from '../../schemas.js'

const LIVELLI = ['info', 'avviso', 'errore'] as const satisfies ReadonlyArray<Messaggio['livello']>

export const procedura = definisci({
  nome: 'sistema.messaggio',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mostra una finestra del sistema con una frase dentro',
  azione: 'sistema.messaggio',
  // Nel registro non cambia niente: due volte è la stessa notifica due volte.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    livello: scelta(LIVELLI, { aiuto: 'Che finestra: informazione, avviso o errore' }),
    testo: testo({ minimo: 1, massimo: 2000 }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['sistema.messaggio'], (i: typeof ingresso) => ({
      tipo: 'sistema.messaggio' as const, ...i,
    }))(ambito, ingresso),
})

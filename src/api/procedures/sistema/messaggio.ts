import { sistema } from '../../../actions/system.js'
import type { Messaggio } from '../../../protocol.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, scelta, testo } from '../../schemas.js'
import { testi } from './sistema.testi.js'

const LIVELLI = ['info', 'avviso', 'errore'] as const satisfies ReadonlyArray<Messaggio['livello']>

export const procedura = scrittura({
  nome: 'sistema.messaggio',
  titolo: () => testi().messaggio.titolo,
  azione: 'sistema.messaggio',
  // Nel registro non cambia niente: due volte è la stessa notifica due volte.
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    livello: scelta(LIVELLI, { aiuto: () => testi().messaggio.livello }),
    testo: testo({ minimo: 1, massimo: 2000 }),
  }),
  esegui: inoltra(sistema, 'sistema.messaggio'),
})

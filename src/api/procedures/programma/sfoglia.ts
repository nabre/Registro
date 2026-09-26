import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto } from '../../schemas.js'
import { chiaveProgramma } from './common.js'
import { testi } from './programma.testi.js'

/**
 * Il percorso di un'impostazione, scelto con il dialogo del sistema: chi chiama
 * sceglie la voce, chi siede davanti allo schermo il valore. Una voce che non
 * è un percorso la rifiuta il gestore; i programmi eseguiti dal registro il
 * condotto non li tocca (`chiaveIntoccabile`).
 */
export const procedura = scrittura({
  nome: 'programma.sfoglia',
  titolo: () => testi().sfoglia.titolo,
  azione: 'programma.sfoglia',
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({ chiave: chiaveProgramma() }),
  esegui: inoltra(sistema, 'programma.sfoglia'),
})

import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto } from '../../schemas.js'
import { chiaveProgramma } from './common.js'
import { testi } from './programma.testi.js'

export const procedura = scrittura({
  nome: 'programma.azzera',
  titolo: () => testi().azzera.titolo,
  azione: 'programma.azzera',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  // Stessa dogana di `programma.salva`: il gestore passa il predefinito da
  // `valoreConMotivo`, che così riconosce la chiave.
  ingresso: oggetto({ chiave: chiaveProgramma() }),
  esegui: inoltra(sistema, 'programma.azzera'),
})

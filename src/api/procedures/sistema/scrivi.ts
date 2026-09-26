import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { testi } from './sistema.testi.js'

export const procedura = scrittura({
  nome: 'sistema.scrivi',
  titolo: () => testi().scrivi.titolo,
  azione: 'sistema.scrivi',
  // Apre una finestra di composizione vuota: non parte niente.
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    // Nessuna espressione regolare qui: che cosa accetta il `mailto:` lo sa
    // `indirizzoScrivibile`.
    indirizzo: testo({ minimo: 1, massimo: 320, aiuto: () => testi().scrivi.indirizzo }),
  }),
  esegui: inoltra(sistema, 'sistema.scrivi'),
})

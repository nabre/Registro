import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, oggetto } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'
import { testi } from './orario.testi.js'

/**
 * Idempotente anche se crea ore: il gestore mette a calendario solo quel che
 * manca.
 */
export const procedura = scrittura({
  nome: 'orario.genera',
  titolo: () => testi().genera.titolo,
  azione: 'orario.genera',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    corsoId: identificatore(),
    dal: iso(),
    al: iso(),
  }),
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId)
    // Orario vuoto e periodo rovesciato li rifiuta il gestore, con il rimedio.
    return inoltra(registro, 'orario.genera')(ambito, ingresso)
  },
})

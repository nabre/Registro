import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { testi } from './esporta.testi.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiCorso } from '../common/register.js'
import { semestreDiEsportazione } from './common.js'

export const procedura = scrittura({
  nome: 'esporta.valutazioni',
  titolo: () => testi().valutazioni.titolo,
  azione: 'esporta.valutazioni',
  // Riscrive lo stesso file con lo stesso nome e lo stesso contenuto.
  idempotente: true,
  // Scrive sul disco, non nel documento: nessuna collezione cambia.
  collezioni: [],
  ingresso: oggetto({
    corsoId: identificatore(),
    semestreId: semestreDiEsportazione(),
  }),
  esegui: (ambito, ingresso) => {
    esigiCorso(ambito, ingresso.corsoId, null)
    // «Nessun momento di valutazione da esportare» lo dice il gestore: è un
    // periodo vuoto, non un id sparito.
    return inoltra(sistema, 'esporta.valutazioni')(ambito, ingresso)
  },
})

import { valutazioni } from '../../../actions/assessments.js'
import { inoltra, scrittura } from '../../core.js'
import { elenco, identificatore, oggetto } from '../../schemas.js'
import { testi } from './valutazioni.testi.js'

const t = () => testi().eliminaOrfane

export const procedura = scrittura({
  nome: 'valutazioni.eliminaOrfane',
  titolo: () => t().titolo,
  azione: 'valutazione.eliminaOrfane',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    // Nessun minimo: l'elenco vuoto lo rifiuta il gestore, con la sua frase.
    ids: elenco(identificatore(), { aiuto: () => t().ids }),
  }),
  // Nessuna guardia sugli id: il gestore salta quel che non c'è più o si è
  // riagganciato a una tappa.
  esegui: inoltra(valutazioni, 'valutazione.eliminaOrfane'),
})

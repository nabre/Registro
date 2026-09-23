import { valutazioni } from '../../../actions/assessments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { elenco, identificatore, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'valutazioni.eliminaOrfane',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Butta via i momenti che nessuna tappa del piano ha fatto nascere',
  azione: 'valutazione.eliminaOrfane',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    // Nessun minimo sull'elenco: l'elenco vuoto lo rifiuta già il gestore, con
    // la sua frase, e fermarlo qui cambierebbe il codice d'errore di una cosa
    // che oggi funziona.
    ids: elenco(identificatore(), {
      aiuto: 'Gli id visti nell’elenco: non «tutti quelli sganciati», che nel frattempo può cambiare',
    }),
  }),
  uscita: SCRITTURA,
  // Nessuna guardia sugli id: quel che non c'è più, o che nel frattempo si è
  // riagganciato a una tappa, il gestore lo salta in silenzio — non è un
  // errore, è la cosa che si voleva.
  esegui: daGestore(valutazioni['valutazione.eliminaOrfane'], (i: { ids: string[] }) => ({
    tipo: 'valutazione.eliminaOrfane' as const, ...i,
  })),
})

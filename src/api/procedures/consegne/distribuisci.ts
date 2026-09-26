import { consegne } from '../../../actions/assignments.js'
import { inoltra, scrittura } from '../../core.js'
import { elenco, identificatore, oggetto, opzionale } from '../../schemas.js'
import { esigiConsegna } from './common.js'
import { testi } from './consegne.testi.js'

const t = () => testi().distribuisci

export const procedura = scrittura({
  nome: 'consegne.distribuisci',
  titolo: () => t().titolo,
  azione: 'consegna.distribuisci',
  // Non idempotente: manda e-mail. Chi è già spedito non torna fra «da
  // consegnare», ma un `allieviIds` esplicito lo rimette in lista.
  idempotente: false,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    // Assente = tutti quelli che aspettano e hanno un documento pronto. Il
    // protocollo non ammette `null`.
    allieviIds: opzionale(elenco(identificatore(), { aiuto: () => t().allieviIds })),
  }),
  esegui: (ambito, ingresso) => {
    // Che si consegni e non si raccolga, e che ci sia qualcosa da spedire, lo dice
    // il gestore.
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.distribuisci')(ambito, ingresso)
  },
})

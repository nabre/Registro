import { consegne } from '../../../actions/assignments.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { elenco, identificatore, oggetto, opzionale } from '../../schemas.js'
import { esigiConsegna } from './common.js'

export const procedura = definisci({
  nome: 'consegne.distribuisci',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Distribuisce i documenti per e-mail: un messaggio a testa, col suo allegato',
  azione: 'consegna.distribuisci',
  // **Non** idempotente, e non per prudenza: manda e-mail. Chiamata due volte
  // spedisce due volte alle stesse famiglie — chi è già segnato spedito non
  // rientra fra quelli «da consegnare», ma un `allieviIds` esplicito lo
  // rimette in lista. Chi chiama da fuori deve saperlo prima di ritentare.
  idempotente: false,
  collezioni: ['consegne'],
  ingresso: oggetto({
    consegnaId: identificatore(),
    // `allieviIds?: string[]`: la chiave assente vuol dire «tutti quelli che
    // aspettano e hanno un documento pronto». Opzionale e basta — il
    // protocollo non ammette `null`, e accettarlo qui vorrebbe dire mandare al
    // gestore un valore che il suo tipo non prevede.
    allieviIds: opzionale(elenco(identificatore(), {
      aiuto: 'Solo questi. Lasciato fuori, tutti quelli che aspettano e hanno un documento pronto',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Che la consegna si consegni e non si raccolga, e che ci sia qualcosa da
    // spedire, lo dice il gestore: sono rifiuti, non voci sparite.
    esigiConsegna(ambito, ingresso.consegnaId)
    return daGestore(consegne['consegna.distribuisci'], (i: typeof ingresso) => ({
      tipo: 'consegna.distribuisci' as const, ...i,
    }))(ambito, ingresso)
  },
})

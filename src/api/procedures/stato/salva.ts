import { documenti } from '../../../actions/documents.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'stato.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive subito quel che è in attesa: il Ctrl+S',
  azione: 'stato.salva',
  // Salvare due volte di fila salva la seconda volta niente: la prima ha già
  // svuotato quel che era in attesa.
  idempotente: true,
  // Il contenuto del registro non cambia — si scrive su disco quel che era già
  // in memoria — e il gestore torna infatti `invariato`.
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(documenti['stato.salva'], (i: typeof ingresso) => ({
      tipo: 'stato.salva' as const, ...i,
    }))(ambito, ingresso),
})

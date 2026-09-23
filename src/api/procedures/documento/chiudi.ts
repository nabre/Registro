import { documenti } from '../../../actions/documents.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'documento.chiudi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Chiude l’anno aperto e libera il file',
  azione: 'documento.chiudi',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(documenti['documento.chiudi'], (i: typeof ingresso) => ({
      tipo: 'documento.chiudi' as const, ...i,
    }))(ambito, ingresso),
})

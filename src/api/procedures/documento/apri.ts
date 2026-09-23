import { documenti } from '../../../actions/documents.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, opzionale } from '../../schemas.js'
import { percorsoDocumento } from './common.js'

export const procedura = definisci({
  nome: 'documento.apri',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre un documento d’anno; senza percorso apre il dialogo del sistema',
  azione: 'documento.apri',
  // Aprire due volte lo stesso documento lascia aperto quello stesso
  // documento. Senza percorso riapre il dialogo, che è la stessa domanda.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    // Facoltativo davvero: è la differenza fra «apri questo» e «chiedimi
    // quale», e il gestore la legge come assenza, non come stringa vuota.
    percorso: opzionale(percorsoDocumento()),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(documenti['documento.apri'], (i: typeof ingresso) => ({
      tipo: 'documento.apri' as const, ...i,
    }))(ambito, ingresso),
})

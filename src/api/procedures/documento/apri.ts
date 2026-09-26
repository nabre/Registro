import { documenti } from '../../../actions/documents.js'
import { inoltra, scrittura } from '../../core.js'
import { testi } from './documento.testi.js'
import { oggetto, opzionale } from '../../schemas.js'
import { percorsoDocumento } from './common.js'

export const procedura = scrittura({
  nome: 'documento.apri',
  titolo: () => testi().apri.titolo,
  azione: 'documento.apri',
  // Aprire due volte lo stesso documento lo lascia aperto; senza percorso si
  // riapre il dialogo.
  idempotente: true,
  collezioni: [],
  documento: 'cambia',
  ingresso: oggetto({
    // Assente vuol dire «chiedimi quale»: il gestore distingue l'assenza dalla
    // stringa vuota.
    percorso: opzionale(percorsoDocumento()),
  }),
  esegui: inoltra(documenti, 'documento.apri'),
})

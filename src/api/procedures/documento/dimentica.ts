import { documenti } from '../../../actions/documents.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto } from '../../schemas.js'
import { percorsoDocumento } from './common.js'

export const procedura = definisci({
  nome: 'documento.dimentica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un documento dall’elenco; il file sul disco non si tocca',
  azione: 'documento.dimentica',
  // La seconda volta non c'è più niente da togliere, e non è un errore.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ percorso: percorsoDocumento() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(documenti['documento.dimentica'], (i: typeof ingresso) => ({
      tipo: 'documento.dimentica' as const, ...i,
    }))(ambito, ingresso),
})

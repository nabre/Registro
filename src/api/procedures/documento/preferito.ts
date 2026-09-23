import { documenti } from '../../../actions/documents.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { booleano, oggetto } from '../../schemas.js'
import { percorsoDocumento } from './common.js'

export const procedura = definisci({
  nome: 'documento.preferito',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mette da parte un documento, o lo lascia tornare fra i recenti',
  azione: 'documento.preferito',
  // Si dichiara il valore voluto, non un interruttore: chiamarla due volte con
  // `preferito: true` lascia la stella accesa una volta sola.
  idempotente: true,
  // L'elenco dei recenti sta in `userData`, non nel documento d'anno. Il
  // gestore non torna `invariato` perché quell'elenco il pannello lo riceve.
  collezioni: [],
  ingresso: oggetto({
    percorso: percorsoDocumento(),
    preferito: booleano({ aiuto: 'Acceso lo mette da parte, spento lo rimette fra i recenti' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(documenti['documento.preferito'], (i: typeof ingresso) => ({
      tipo: 'documento.preferito' as const, ...i,
    }))(ambito, ingresso),
})

// Ferma lo scarico in corso, o toglie un file dalla coda. Senza `file` si ferma
// quel che scende e la coda prosegue.
//
// Idempotente: fermare quel che è già fermo non è un errore. Il file scaricato
// a metà si cancella, perché sembrerebbe un modello che non si carica.

import { llm } from '../../../actions/llm.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, opzionale, testo } from '../../schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().annulla

export const procedura = scrittura({
  nome: 'llm.annulla',
  titolo: () => t().titolo,
  azione: 'llm.annulla',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    file: opzionale(testo({
      aiuto: () => t().file,
      esempio: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    })),
  }),
  esegui: inoltra(llm, 'llm.annulla'),
})

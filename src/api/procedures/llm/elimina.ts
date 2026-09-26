// Toglie un modello dalla cartella. Non idempotente: il secondo tentativo dice
// che il file non c'è più.
//
// Il file non passa dal cestino; il nome passa da `modelloNellaCartella`, che
// cancella solo `.gguf` e solo in quella cartella.

import { llm } from '../../../actions/llm.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().elimina

export const procedura = scrittura({
  nome: 'llm.elimina',
  titolo: () => t().titolo,
  azione: 'llm.elimina',
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    nome: testo({ aiuto: () => t().nome }),
  }),
  esegui: inoltra(llm, 'llm.elimina'),
})

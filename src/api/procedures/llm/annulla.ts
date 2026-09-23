// Ferma lo scarico in corso.
//
// Idempotente, e vale la pena dirlo: fermare quel che è già fermo non è un
// errore. Chi preme due volte «Annulla» — perché la barra non è sparita subito,
// perché la riga è ancora lì — non deve leggere un rifiuto.
//
// Quel che era sceso a metà se ne va con lui: un file tronco nella cartella dei
// modelli è un modello che sembra esserci e non si carica.

import { llm } from '../../../actions/llm.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.annulla',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Ferma lo scarico di un modello in corso',
  azione: 'llm.annulla',
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(llm['llm.annulla'], () => ({ tipo: 'llm.annulla' as const }))(ambito, ingresso),
})

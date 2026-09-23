// Toglie un modello dalla cartella.
//
// Idempotente no: il secondo tentativo trova che il file non c'è più e lo dice.
// È l'informazione giusta — «non è fra i modelli scaricati» — e non un errore
// di trasporto da ritentare.
//
// Quel che si cancella è un file da gigabyte che non passa dal cestino: chi
// preme lo fa da una pagina che glielo chiede, e il nome passa comunque da
// `modelloNellaCartella`, che cancella soltanto lì dentro e soltanto `.gguf`.

import { llm } from '../../../actions/llm.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un modello del linguaggio dalla cartella',
  azione: 'llm.elimina',
  idempotente: false,
  collezioni: [],
  ingresso: oggetto({
    nome: testo({ aiuto: 'Il nome del file, come lo elenca «llm.modelli»' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(llm['llm.elimina'], (i: typeof ingresso) => ({
      tipo: 'llm.elimina' as const, ...i,
    }))(ambito, ingresso),
})

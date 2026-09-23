// Scarica un modello.
//
// Ritorna appena lo scarico è partito, non quando è finito: venti minuti di
// coda delle scritture sarebbero venti minuti in cui non si segna un'assenza.
// Il resto lo racconta l'avanzamento — `MessaggioScarico` in `protocol.ts`.
//
// Non idempotente, e non per cautela: due chiamate uguali sono due file nella
// cartella, perché `data/gguf.ts` non sovrascrive mai un modello che c'è già.
// Quello di prima potrebbe essere quello che l'assistente sta usando adesso.

import { llm } from '../../../actions/llm.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, opzionale, scelta, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.scarica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scarica un modello del linguaggio nella cartella dei modelli',
  azione: 'llm.scarica',
  idempotente: false,
  collezioni: [],
  ingresso: oggetto({
    deposito: testo({
      aiuto: 'Il deposito di Hugging Face: «bartowski/Qwen2.5-7B-Instruct-GGUF»',
      esempio: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    }),
    file: testo({
      aiuto: 'Quale file, come lo elenca «llm.file»',
      esempio: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    }),
    per: opzionale(scelta(['assistente', 'ocr'], {
      aiuto: 'Per quale mestiere: arrivato, si sceglie da sé per quello',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(llm['llm.scarica'], (i: typeof ingresso) => ({
      tipo: 'llm.scarica' as const, ...i,
    }))(ambito, ingresso),
})

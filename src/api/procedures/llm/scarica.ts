// Scarica un modello. Torna appena lo scarico parte, per non tenere la coda
// delle scritture; il resto lo racconta `MessaggioScarico` in `protocol.ts`.
//
// Non idempotente: `data/gguf.ts` non sovrascrive un modello esistente (potrebbe
// essere in uso), quindi due chiamate fanno due file.

import { llm } from '../../../actions/llm.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, opzionale, scelta, testo } from '../../schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().scarica

export const procedura = scrittura({
  nome: 'llm.scarica',
  titolo: () => t().titolo,
  azione: 'llm.scarica',
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    deposito: testo({
      aiuto: () => t().deposito,
      esempio: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    }),
    file: testo({
      aiuto: () => t().file,
      esempio: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    }),
    per: opzionale(scelta(['assistente', 'ocr'], { aiuto: () => t().per })),
  }),
  esegui: inoltra(llm, 'llm.scarica'),
})

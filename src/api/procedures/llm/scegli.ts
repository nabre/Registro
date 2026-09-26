// Dice quale modello lavora per quale mestiere. Scrive nelle impostazioni del
// programma, che nessun webview scrive direttamente.
//
// Il modello vuoto vuol dire «nessuno»: è il modo di disfare una scelta.
// `prontezza()` dirà poi come rimediare.

import { llm } from '../../../actions/llm.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, opzionale, scelta, testo } from '../../schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().scegli

export const procedura = scrittura({
  nome: 'llm.scegli',
  titolo: () => t().titolo,
  azione: 'llm.scegli',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    uso: scelta(['assistente', 'ocr'], { aiuto: () => t().uso }),
    modello: testo({ aiuto: () => t().modello }),
    proiettore: opzionale(testo({ aiuto: () => t().proiettore })),
  }),
  esegui: inoltra(llm, 'llm.scegli'),
})

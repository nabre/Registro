// Dice quale modello lavora per quale mestiere.
//
// Scrive nelle impostazioni e non nel registro: è l'unica procedura che lo fa,
// e c'è perché la pagina dei modelli non ha la penna sul file di
// configurazione — non ce l'ha nessun webview, ed è voluto.
//
// Il modello vuoto vuol dire «nessuno», ed è legittimo: è il modo di disfare
// una scelta senza doverne fare un'altra. Chi poi prova a chiedere qualcosa
// riceve da `prontezza()` la frase che dice come rimediare.

import { llm } from '../../../actions/llm.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, opzionale, scelta, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.scegli',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Sceglie quale modello usa l’assistente o la lettura delle scansioni',
  azione: 'llm.scegli',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    uso: scelta(['assistente', 'ocr'], { aiuto: 'Per quale mestiere lavora questo modello' }),
    modello: testo({ aiuto: 'Il nome del file, o vuoto per non usarne nessuno' }),
    proiettore: opzionale(testo({
      aiuto: 'Il file «mmproj» del modello che guarda: serve solo alla lettura delle scansioni',
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(llm['llm.scegli'], (i: typeof ingresso) => ({
      tipo: 'llm.scegli' as const, ...i,
    }))(ambito, ingresso),
})

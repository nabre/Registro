// Prende un `.gguf` che si ha già.
//
// È la strada di chi il modello ce l'ha sul disco — scaricato con un altro
// programma, arrivato su una chiavetta, copiato dal collega — e non vuole
// scaricare quattro gigabyte una seconda volta. Ci si trascina sopra il file, o
// lo si sceglie con il dialogo: di qui passano tutte e due.
//
// **Il percorso che arriva non è il percorso che si apre.** `data/gguf.ts`
// guarda che sia davvero un GGUF — i primi quattro byte, non l'estensione — e
// ne fa una copia nella cartella dei modelli, con un nome ripulito.

import { llm } from '../../../actions/llm.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { oggetto, testo } from '../../schemas.js'

export const procedura = definisci({
  nome: 'llm.importa',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Prende un file .gguf che si ha già e lo mette fra i modelli',
  azione: 'llm.importa',
  idempotente: false,
  collezioni: [],
  ingresso: oggetto({
    file: testo({
      aiuto:
        'Il percorso intero del file .gguf da copiare fra i modelli. Vuoto apre il dialogo ' +
        'di sistema, che è quel che fa il pulsante «Carica un file…»',
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(llm['llm.importa'], (i: typeof ingresso) => ({
      tipo: 'llm.importa' as const, ...i,
    }))(ambito, ingresso),
})

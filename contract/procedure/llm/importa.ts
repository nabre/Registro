// Prende un `.gguf` che si ha già sul disco, trascinato o scelto con il
// dialogo. `data/gguf.ts` verifica che sia un GGUF (i primi quattro byte, non
// l'estensione) e ne fa una copia nella cartella dei modelli, con un nome
// ripulito.

import { llm } from '#core/azioni/llm.js'
import { inoltra, scrittura } from '#contract/core.js'
import { oggetto, testo } from '#contract/schemas.js'
import { testi } from './llm.testi.js'

const t = () => testi().importa

export const procedura = scrittura({
  nome: 'llm.importa',
  titolo: () => t().titolo,
  azione: 'llm.importa',
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    file: testo({
      aiuto: () => t().file,
    }),
  }),
  esegui: inoltra(llm, 'llm.importa'),
})

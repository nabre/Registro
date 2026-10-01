// Esce, installa la versione scaricata e riapre il registro. Non idempotente:
// chiude tutte le finestre. L'uscita passa da `before-quit`, che aspetta
// l'ultimo salvataggio.

import { aggiornamenti } from '#core/azioni/updates.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './aggiornamenti.testi.js'

export const procedura = scrittura({
  nome: 'aggiornamenti.installa',
  titolo: () => testi().installa.titolo,
  azione: 'aggiornamenti.installa',
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: vuoto(),
  esegui: inoltra(aggiornamenti, 'aggiornamenti.installa'),
})

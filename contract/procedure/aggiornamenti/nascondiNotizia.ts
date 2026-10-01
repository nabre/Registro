// Nasconde una notizia dal filetto degli aggiornamenti per tutte le superfici.

import { aggiornamenti } from '#core/azioni/updates.js'
import { inoltra, scrittura } from '#contract/core.js'
import { oggetto, testo } from '#contract/schemas.js'
import { testi } from './aggiornamenti.testi.js'

export const procedura = scrittura({
  nome: 'aggiornamenti.nascondiNotizia',
  titolo: () => testi().nascondiNotizia.titolo,
  azione: 'aggiornamenti.nascondiNotizia',
  idempotente: true,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    notizia: testo({ aiuto: () => testi().nascondiNotizia.notizia }),
  }),
  esegui: inoltra(aggiornamenti, 'aggiornamenti.nascondiNotizia'),
})

// Quanto è grande quel che si vede, un passo per volta.
//
// `scrittura` come `vista.apri`: il genere dice se serve il permesso di
// scrivere, e ingrandire lo schermo di chi fa lezione non va concesso alla sola
// lettura né al modello dell'assistente (non dichiara `assistente`).

import { sistema } from '../../../actions/system.js'
import { inoltra, scrittura } from '../../core.js'
import { oggetto, scelta } from '../../schemas.js'
import { testi } from './finestra.testi.js'

const t = () => testi().zoom

export const procedura = scrittura({
  nome: 'finestra.zoom',
  titolo: () => t().titolo,
  azione: 'finestra.zoom',
  // Due «avanti» ingrandiscono due volte.
  idempotente: false,
  collezioni: [],
  documento: 'indipendente',
  ingresso: oggetto({
    verso: scelta(['avanti', 'indietro', 'azzera'] as const, { aiuto: () => t().verso }),
  }),
  esegui: inoltra(sistema, 'finestra.zoom'),
})

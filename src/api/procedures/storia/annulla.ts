// Annulla l'ultimo gesto sul registro: Ctrl+Z fuori da un campo di testo.
//
// La storia vive nell'host, in memoria, e raccoglie i gesti del pannello. Le
// scritture di altri (condotto, assistente) non aggiungono passi ma cambiano i
// numeri di versione, e allora l'annullamento viene rifiutato invece di
// cancellare il loro lavoro. Vedi `data/history.ts`.
//
// Tutte le collezioni: quali tocca il passo si sa solo a runtime.

import { storia } from '../../../actions/history.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './storia.testi.js'

const t = () => testi().annulla

export const procedura = scrittura({
  nome: 'storia.annulla',
  titolo: () => t().titolo,
  azione: 'storia.annulla',
  // Due chiamate annullano due passi.
  idempotente: false,
  collezioni: [
    'registro', 'classi', 'corsi', 'lezioni', 'piani', 'valutazioni',
    'fascicoli', 'consegne', 'check', 'smistamenti', 'coordinate',
  ],
  ingresso: vuoto(),
  esegui: inoltra(storia, 'storia.annulla'),
})

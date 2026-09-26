// Rifà l'ultimo gesto annullato: Ctrl+Y fuori da un campo di testo. Stesse
// regole di `storia.annulla`; un gesto nuovo del pannello dopo l'annullamento
// cancella quel che c'era da ripristinare.

import { storia } from '../../../actions/history.js'
import { inoltra, scrittura } from '../../core.js'
import { vuoto } from '../../schemas.js'
import { testi } from './storia.testi.js'

const t = () => testi().ripristina

export const procedura = scrittura({
  nome: 'storia.ripristina',
  titolo: () => t().titolo,
  azione: 'storia.ripristina',
  // Due chiamate rifanno due passi.
  idempotente: false,
  collezioni: [
    'registro', 'classi', 'corsi', 'lezioni', 'piani', 'valutazioni',
    'fascicoli', 'consegne', 'check', 'smistamenti', 'coordinate',
  ],
  ingresso: vuoto(),
  esegui: inoltra(storia, 'storia.ripristina'),
})

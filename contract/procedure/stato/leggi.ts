import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { vuoto } from '#contract/schemas.js'
import { testi } from './stato.testi.js'

const t = () => testi().leggi

/**
 * Il segnale che un pannello si è aperto: rilegge `templates/`, che può essere
 * cambiata da fuori, e la risposta arriva con lo stato spinto al pannello.
 */
export const procedura = scrittura({
  nome: 'stato.leggi',
  // `scrittura`: cambia lo stato dell'applicazione ed è il segnale «sono pronto»
  // che sblocca la navigazione del pannello, quindi fuori dal canale delle
  // domande.
  titolo: () => t().titolo,
  azione: 'stato.leggi',
  idempotente: true,
  // La prima volta porta dentro l'intestazione di una vecchia `templates/`
  // (`portaDentroLaVecchiaCartella`).
  collezioni: ['registro'],
  ingresso: vuoto(),
  esegui: inoltra(registro, 'stato.leggi'),
})

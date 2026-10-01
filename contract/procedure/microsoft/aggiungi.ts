import { microsoft } from '#core/azioni/microsoft.js'
import { inoltra, scrittura } from '#contract/core.js'
import { oggetto, opzionale, testo } from '#contract/schemas.js'
import { testi } from './microsoft.testi.js'

export const procedura = scrittura({
  nome: 'microsoft.aggiungi',
  titolo: () => testi().aggiungi.titolo,
  azione: 'microsoft.aggiungi',
  // Ogni volta apre il browser e chiede di entrare: ripeterla non è gratis.
  idempotente: false,
  // Il gettone va nel portachiavi del sistema, non nel registro; il gestore non
  // torna `invariato` perché l'elenco degli account nel pannello cambia.
  collezioni: [],
  documento: 'indipendente',
  // L'attesa del browser dura minuti: in fila fermerebbe ogni altra scrittura.
  fuoriFila: true,
  ingresso: oggetto({
    indirizzo: opzionale(testo({
      aiuto: () => testi().aggiungi.indirizzo,
      esempio: 'nome.cognome@scuola.ch',
    })),
  }),
  esegui: inoltra(microsoft, 'microsoft.aggiungi'),
})

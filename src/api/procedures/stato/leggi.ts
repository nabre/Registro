import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

/**
 * Il segnale che un pannello si è aperto.
 *
 * `scrittura` e non `lettura`, benché il registro non lo tocchi: quel che il
 * gestore fa — rileggere `templates/` — cambia lo stato dell'applicazione, e
 * la risposta non passa dalla busta di una lettura ma dallo stato spinto al
 * pannello. Vedi il commento su `genere`, qui sotto.
 *
 * Rileggere serve perché quella cartella può essere cambiata da fuori mentre
 * la finestra era chiusa.
 */
export const procedura = definisci({
  nome: 'stato.leggi',
  versione: 1,
  // Rilegge l'inventario di `templates/` dal disco, ed è il segnale «sono
  // pronto» con cui il pannello sblocca la navigazione in attesa: tocca meno
  // del registro, non meno del mondo. Quindi fuori dal canale delle domande.
  genere: 'scrittura',
  titolo: 'Chiede lo stato del registro, e rilegge la cartella dei modelli',
  azione: 'stato.leggi',
  idempotente: true,
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(registro['stato.leggi'], (_i: typeof ingresso) => ({
      tipo: 'stato.leggi' as const,
    }))(ambito, ingresso),
})

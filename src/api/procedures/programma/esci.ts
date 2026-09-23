// Chiude il registro.
//
// Nessuna conferma, e non è una dimenticanza: il documento si salva da sé a
// ogni modifica, e una domanda «salvare prima di uscire?» prometterebbe che ci
// sia qualcosa da perdere.
//
// `scrittura`, come le altre che non scrivono: chiudere il registro di chi sta
// facendo lezione non è una cosa che si concede a chi ha la sola lettura. Al
// modello dell'assistente non si concede affatto — non dichiara `assistente`,
// e il valore assente vale `false`.

import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'programma.esci',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Chiude il registro',
  azione: 'programma.esci',
  // Chiuderlo due volte lo lascia chiuso.
  idempotente: true,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['programma.esci'], (i: typeof ingresso) => ({
      tipo: 'programma.esci' as const, ...i,
    }))(ambito, ingresso),
})

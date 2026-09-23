// La finestra di chi insegna a schermo intero, e di nuovo indietro.
//
// Non è `proiezione.schermo`, e la differenza vale la seconda voce: quella
// accende lo schermo per la classe sul secondo monitor, questa allarga la
// finestra su cui si sta lavorando. Due comandi che si somigliano nel nome e
// non nel mestiere.
//
// `scrittura` per la ragione di `vista.apri`: il genere dice chi può chiamarla
// da fuori, non se l'archivio cambia.

import { sistema } from '../../../actions/system.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'finestra.schermoIntero',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mette a schermo intero la finestra del registro, o la rimette com’era',
  azione: 'finestra.schermoIntero',
  // È un interruttore: chiamarla due volte riporta la finestra dov'era.
  idempotente: false,
  collezioni: [],
  ingresso: vuoto(),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['finestra.schermoIntero'], (i: typeof ingresso) => ({
      tipo: 'finestra.schermoIntero' as const, ...i,
    }))(ambito, ingresso),
})

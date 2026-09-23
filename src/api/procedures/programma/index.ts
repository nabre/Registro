// Il programma in sé: le sue impostazioni — salvarne una, azzerarle — e la
// via d'uscita.
//
// La chiave è controllata dallo schema e non dal gestore, perché qui chi chiama
// da fuori sceglie *quale* impostazione toccare: una chiave che non esiste deve
// fermarsi prima di arrivare alla configurazione.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as azzera } from './azzera.js'
import { procedura as esci } from './esci.js'
import { procedura as salva } from './salva.js'

export const procedureProgramma: ProceduraQualunque[] = [
  azzera,
  esci,
  salva,
]

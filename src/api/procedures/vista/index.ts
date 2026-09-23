// Le pagine del registro, aperte da fuori della pagina.
//
// Una sola per ora, e l'area esiste lo stesso: `vista.apri` non appartiene a
// nessun'altra — non è l'assistente, che ne è solo il primo chiamante, e non è
// il sistema, che apre cartelle e file altrui. Metterla altrove avrebbe voluto
// dire un nome che racconta chi la chiama invece di che cosa fa.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as apri } from './apri.js'

export const procedureVista: ProceduraQualunque[] = [
  apri,
]

// Le impostazioni del registro, salvate da chi le ha cambiate.
//
// Non tocca nessuna raccolta: quel che cambia sta nella configurazione, non
// nel documento d'anno. Lo schema è l'unico punto in cui la forma di quelle
// impostazioni è dichiarata a chi chiama da fuori.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as salva } from './salva.js'

export const procedureImpostazioni: ProceduraQualunque[] = [
  salva,
]

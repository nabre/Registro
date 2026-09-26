// I voti. La regola sul voto resta nel dominio (`votoValido`, `arrotondaVoto`):
// la scala è copiata nel momento, e la controlla solo chi ha il momento in
// mano. Il contratto ferma prima dell'archivio un `valore: "quattro"` e
// distingue «il momento non c'è più» (si rilegge e si ritenta) da «voto fuori
// scala» (mai).
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as daAttivita } from './daAttivita.js'
import { procedura as elenco } from './elenco.js'
import { procedura as elimina } from './elimina.js'
import { procedura as eliminaOrfane } from './eliminaOrfane.js'
import { procedura as riconsegna } from './riconsegna.js'
import { procedura as salva } from './salva.js'
import { procedura as voti } from './voti.js'
import { procedureValutazioniAllegato } from './allegato/index.js'
import { procedureValutazioniRecupero } from './recupero/index.js'
import { procedureValutazioniVoto } from './voto/index.js'

export const procedureValutazioni: ProceduraQualunque[] = [
  daAttivita,
  elenco,
  elimina,
  eliminaOrfane,
  riconsegna,
  salva,
  ...procedureValutazioniAllegato,
  ...procedureValutazioniRecupero,
  ...procedureValutazioniVoto,
  voti,
]

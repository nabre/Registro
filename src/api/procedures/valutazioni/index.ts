// I voti.
//
// `valutazioni.voto.imposta` era già l'azione meglio difesa del protocollo —
// l'unica con una convalida numerica scritta a mano, `votoValido` più
// `arrotondaVoto` — e proprio per questo è quella su cui si vede meglio che
// cosa aggiunge un contratto e che cosa no.
//
// Non aggiunge la regola sul voto: quella resta dove sta, nel dominio, perché
// la scala è **copiata dentro il momento** e cambiare la scala del registro non
// deve riscrivere i voti già dati — un controllo che solo chi ha in mano il
// momento può fare. Aggiunge che un `valore: "quattro"` arrivato da fuori
// viene fermato prima di toccare l'archivio invece di diventare `NaN`, e che
// «il momento non c'è più» torna con un codice diverso da «il voto è fuori
// scala»: il primo si ritenta dopo aver riletto, il secondo mai.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

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

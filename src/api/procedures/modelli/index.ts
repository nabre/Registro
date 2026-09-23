// I modelli dei fogli: leggerli, salvarli, rimetterli com'erano, provarli.
//
// Due di queste cinque sono letture — `modelli.leggi` e `modelli.prova` —
// ed erano azioni finché il protocollo non ha avuto un canale per le domande:
// due scritture che non scrivevano, con tre campi (`testo`, `nomi`, `pdf`)
// che stavano nella busta di ogni scrittura per servire quelle due sole.
//
// Il lavoro vive in `src/actions/templates.ts`, dove la lettura di un modello e
// la sua anteprima sono state *estratte* in due funzioni esportate perché le
// procedure potessero chiamarle senza copiarle.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as immagine } from './immagine.js'
import { procedura as leggi } from './leggi.js'
import { procedura as prova } from './prova.js'
import { procedura as ripristina } from './ripristina.js'
import { procedura as salva } from './salva.js'

export const procedureModelli: ProceduraQualunque[] = [
  immagine,
  leggi,
  prova,
  ripristina,
  salva,
]

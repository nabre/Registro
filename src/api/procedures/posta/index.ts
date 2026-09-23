// La posta: collegare la casella, provarla, mandare una mail di prova.
//
// È l'area in cui il contratto serve meno a proteggere il registro — niente di
// qui dentro tocca una collezione — e più a dire che cosa succede fuori: una
// di queste alza la cornetta, e una spedisce davvero una mail a un indirizzo
// vero. Per una mail che parte, `idempotente` è la differenza fra un
// tentativo e due messaggi.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as collega } from './collega.js'
import { procedura as invioProva } from './invioProva.js'
import { procedura as prova } from './prova.js'
import { procedura as scollega } from './scollega.js'

export const procedurePosta: ProceduraQualunque[] = [
  collega,
  invioProva,
  prova,
  scollega,
]

// Le due domande che si fanno al registro intero: il riassunto e l'integrità.
//
// Per il pannello sono superflue, e resta vero: ha già tutto, perché l'host gli
// spinge l'intero `Registro` dopo ogni scrittura. Chi arriva da fuori, però,
// quello stato non ce l'ha — e `registro.riassunto` è la prima cosa che
// chiede, perché senza non sa nemmeno quali anni esistano.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as integrita } from './integrita.js'
import { procedura as riassunto } from './riassunto.js'

export const procedureRegistro: ProceduraQualunque[] = [
  integrita,
  riassunto,
]

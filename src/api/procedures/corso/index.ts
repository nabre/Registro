// Le presenze di un corso: una lettura, e il conto già fatto.
//
// Una riga di comando che voglia sapere quante ore ha perso una persona non
// può ricevere trenta megabyte di registro e farsi i conti da sé: rifarebbe,
// in un altro linguaggio, gli stessi conti che `dominio/` fa già — e li
// rifarebbe diversi, che è esattamente il problema che i tre denominatori di
// `courseMatrix.ts` esistono per evitare.
//
// Quindi qui torna **il conto già fatto dal dominio**, mai il dato grezzo da
// ricontare. E torna una forma piatta e dichiarata, non i tipi interni:
// `RigaCorso` può cambiare quando serve al registro, la risposta di
// `corso.presenze` no, perché è un contratto con chi la legge.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as presenze } from './presenze.js'

export const procedureCorso: ProceduraQualunque[] = [
  presenze,
]

// La finestra del registro: quanto è grande quel che si vede, e se occupa
// tutto lo schermo.
//
// Sono qui e non fra i comandi del sistema perché parlano della *finestra* e
// non della macchina: `sistema.apriCartella` consegna qualcosa al sistema
// operativo, queste due toccano quella cosa lì sullo schermo, quella con il
// registro dentro.
//
// Esistono come procedure perché esistono come voci di menu: da quando il
// registro si disegna la barra del titolo da sé, su Windows e Linux la barra
// dei menu di sistema non si vede più, e «Ingrandisci» o «Schermo intero»
// vivono nella tendina «File» — che passa di qui come ogni altro comando.
//
// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è
// nominato qui non si registra, e questo è il punto in cui ci si accorge che
// manca.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as schermoIntero } from './schermoIntero.js'
import { procedura as zoom } from './zoom.js'

export const procedureFinestra: ProceduraQualunque[] = [
  schermoIntero,
  zoom,
]

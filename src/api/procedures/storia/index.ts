// Le procedure di `storia`: annullare e ripristinare i gesti sul registro.
//
// Elenco a mano: un file non nominato qui non si registra.

import type { ProceduraQualunque } from '../../contract.js'
import { procedura as annulla } from './annulla.js'
import { procedura as ripristina } from './ripristina.js'

export const procedureStoria: ProceduraQualunque[] = [
  annulla,
  ripristina,
]

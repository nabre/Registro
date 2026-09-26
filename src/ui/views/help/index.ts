// La guida intera, nell'ordine in cui si legge.
//
// Ogni parte sta in un file suo, così chi aggiorna la pagina Lezione tocca
// `lesson.ts` e nient'altro. Qui si mettono in fila e basta: l'ordine delle
// sezioni dentro una parte è l'ordine di questo elenco, e l'ordine delle parti
// è quello dei gruppi della barra laterale (`ORDINE` in `ui/pages.ts`).

import { SEZIONI_ASSISTENTE } from './assistant.js'
import { SEZIONI_QUINTE } from './behind.js'
import { SEZIONI_CALENDARIO } from './calendar.js'
import { SEZIONI_DOCENTE } from './classTeacher.js'
import { SEZIONI_VALUTAZIONI } from './grades.js'
import { SEZIONI_LEZIONE } from './lesson.js'
import { SEZIONI_FUORI } from './outside.js'
import { SEZIONI_PERSONE } from './people.js'
import { SEZIONI_IMPOSTAZIONI } from './settings.js'
import { SEZIONI_IMPIANTO } from './setup.js'
import { SEZIONI_INIZIO } from './start.js'
import type { ParteGuida, SezioneGuida } from './types.js'

export { cerca, forseCercavi, migliori, paroleDi, piano, rispondeA, type Risultato, type SezioneTrovata } from './search.js'
export type { FiguraGuida, NotaGuida, ParteGuida, SezioneGuida, VoceGuida } from './types.js'

export const GUIDA: readonly SezioneGuida[] = [
  ...SEZIONI_INIZIO,
  ...SEZIONI_CALENDARIO,
  ...SEZIONI_LEZIONE,
  ...SEZIONI_VALUTAZIONI,
  ...SEZIONI_DOCENTE,
  ...SEZIONI_PERSONE,
  ...SEZIONI_IMPOSTAZIONI,
  ...SEZIONI_IMPIANTO,
  ...SEZIONI_ASSISTENTE,
  ...SEZIONI_FUORI,
  ...SEZIONI_QUINTE,
]

export const PARTI: readonly ParteGuida[] = [
  'inizio',
  'agenda',
  'registro',
  'docenteClasse',
  'anno',
  'programma',
  'fuori',
  'quinte',
]

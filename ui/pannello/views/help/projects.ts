// La guida: i progetti del corso — la pagina Progetti, la scheda Progetto
// dell'ora, le fasi del piano e le valutazioni che ne fanno parte.
//
// Solo struttura: le parole stanno in `projects.testi.ts`.

import { testi } from './projects.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

export const SEZIONI_PROGETTI: readonly SezioneGuida[] = [
  sezione({
    id: 'progetti',
    parte: 'registro',
    simbolo: 'progetto',
    vista: 'progetti',
    note: ['meccanismo', 'attenzione', 'consiglio'],
    vedi: ['piani', 'valutazioni', 'lezione'],
  }, T.progetti),
]

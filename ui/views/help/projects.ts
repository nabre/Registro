// La guida: i progetti — la pagina Progetti (la biblioteca dell'anno), la loro
// integrazione nei corsi, la scheda Progetto dell'ora, le fasi nei piani e le
// valutazioni che ne fanno parte.
//
// Solo struttura: le parole stanno in `projects.testi.ts`.

import { testi } from './projects.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

export const SEZIONI_PROGETTI: readonly SezioneGuida[] = [
  sezione({
    id: 'integrazioneProgetti',
    parte: 'registro',
    simbolo: 'innesto',
    note: ['meccanismo', 'attenzione', 'consiglio'],
    vedi: ['progetti', 'piani', 'valutazioni', 'lezione'],
  }, T.integrazione),
  sezione({
    id: 'progetti',
    parte: 'anno',
    simbolo: 'progetto',
    vista: 'progetti',
    note: ['meccanismo', 'attenzione'],
    vedi: ['integrazioneProgetti', 'piani'],
  }, T.progetti),
]

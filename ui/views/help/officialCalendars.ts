// La guida: calendari-ufficiali. Solo struttura: le parole stanno in
// `officialCalendars.testi.ts`. A parte da `settings.ts` perché la scheda è sua
// e si legge da sola.

import { testi } from './officialCalendars.testi.js'
import { sezione, type SezioneGuida } from './types.js'

const T = testi()

export const SEZIONI_CALENDARI_UFFICIALI: readonly SezioneGuida[] = [
  sezione({
    id: 'calendari-ufficiali',
    parte: 'programma',
    simbolo: 'calendario',
    vista: 'impostazioni',
    vedi: ['impostazioni-anno', 'impostazioni'],
  }, T.calendariUfficiali),
]

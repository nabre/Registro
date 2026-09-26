// I testi di `calendar.ts`: le differenze fra una lezione e il calendario,
// dette nella riga del confronto.

import { catalogo } from '../i18n/index.js'

const it = {
  annullataNelCalendario: 'annullata nel calendario',
  cambioAula: (prima: string, dopo: string) => `aula ${prima} → ${dopo}`,
}

export const testi = catalogo(it, {
  de: {
    annullataNelCalendario: 'im Kalender abgesagt',
    cambioAula: (prima, dopo) => `Zimmer ${prima} → ${dopo}`,
  },
  fr: {
    annullataNelCalendario: 'annulée dans le calendrier',
    cambioAula: (prima, dopo) => `salle ${prima} → ${dopo}`,
  },
  en: {
    annullataNelCalendario: 'cancelled in the calendar',
    cambioAula: (prima, dopo) => `room ${prima} → ${dopo}`,
  },
})

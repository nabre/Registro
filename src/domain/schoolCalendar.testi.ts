// I testi di `schoolCalendar.ts`: le due voci del calendario scolastico che
// non vengono dal cantone ma dal registro — dove l'anno comincia e dove finisce.

import { catalogo } from '../i18n/index.js'

const it = {
  inizioLezioni: 'Inizio delle lezioni',
  fineLezioni: 'Fine delle lezioni',
}

export const testi = catalogo(it, {
  de: {
    inizioLezioni: 'Unterrichtsbeginn',
    fineLezioni: 'Unterrichtsende',
  },
  fr: {
    inizioLezioni: 'Début des cours',
    fineLezioni: 'Fin des cours',
  },
  en: {
    inizioLezioni: 'Start of lessons',
    fineLezioni: 'End of lessons',
  },
})

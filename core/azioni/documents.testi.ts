// I testi di `documents.ts`: com'è andato il salvataggio chiesto a mano.

import { catalogo } from '../i18n/index.js'

const it = {
  provvisorio: 'L’anno non è salvato: è ancora provvisorio, e non è stato scelto dove metterlo.',
  salvato: 'Tutto salvato.',
}

export const testi = catalogo(it, {
  de: {
    provvisorio:
      'Das Schuljahr ist nicht gespeichert: Es ist noch provisorisch, und es wurde kein ' +
      'Speicherort gewählt.',
    salvato: 'Alles gespeichert.',
  },
  fr: {
    provvisorio:
      'L’année n’est pas enregistrée : elle est encore provisoire, et aucun emplacement ' +
      'n’a été choisi.',
    salvato: 'Tout est enregistré.',
  },
  en: {
    provvisorio: 'The year isn’t saved: it’s still provisional, and no location has been chosen.',
    salvato: 'Everything saved.',
  },
})

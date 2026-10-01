// I testi di `dashboard.ts`: perché un'ora passata è rimasta aperta, a parole.

import { catalogo } from '#core/i18n/index.js'

const it = {
  senzaAppello: 'senza appello',
  nonSegnataSvolta: 'non conclusa',
}

export const testi = catalogo(it, {
  de: {
    senzaAppello: 'ohne Präsenzkontrolle',
    nonSegnataSvolta: 'nicht abgeschlossen',
  },
  fr: {
    senzaAppello: 'sans appel',
    nonSegnataSvolta: 'pas terminée',
  },
  en: {
    senzaAppello: 'no attendance taken',
    nonSegnataSvolta: 'not completed',
  },
})

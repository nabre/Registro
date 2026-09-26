// I testi di `dashboard.ts`: perché un'ora passata è rimasta aperta, a parole.

import { catalogo } from '../i18n/index.js'

const it = {
  senzaAppello: 'senza appello',
  nonSegnataSvolta: 'non segnata svolta',
}

export const testi = catalogo(it, {
  de: {
    senzaAppello: 'ohne Präsenzkontrolle',
    nonSegnataSvolta: 'nicht als gehalten markiert',
  },
  fr: {
    senzaAppello: 'sans appel',
    nonSegnataSvolta: 'pas marquée comme donnée',
  },
  en: {
    senzaAppello: 'no attendance taken',
    nonSegnataSvolta: 'not marked as held',
  },
})

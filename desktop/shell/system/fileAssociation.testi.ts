// I testi dei `.regi` per Esplora file: il nome del tipo di file, che si
// legge nella colonna «Tipo» e nelle proprietà, e la voce che li apre.

import { catalogo } from '#core/i18n/index.js'

const it = {
  tipoDiFile: 'Anno scolastico Regiklass',
  apriCon: 'Apri con Regiklass',
}

export const testi = catalogo(it, {
  de: {
    tipoDiFile: 'Regiklass-Schuljahr',
    apriCon: 'Mit Regiklass öffnen',
  },
  fr: {
    tipoDiFile: 'Année scolaire Regiklass',
    apriCon: 'Ouvrir avec Regiklass',
  },
  en: {
    tipoDiFile: 'Regiklass school year',
    apriCon: 'Open with Regiklass',
  },
})

// I testi dei `.regi` per Esplora file: il nome del tipo di file, che si
// legge nella colonna «Tipo» e nelle proprietà, e la voce che li apre.

import { catalogo } from '../../src/i18n/index.js'

const it = {
  tipoDiFile: 'Anno scolastico Regiclass',
  apriCon: 'Apri con Regiclass',
}

export const testi = catalogo(it, {
  de: {
    tipoDiFile: 'Regiclass-Schuljahr',
    apriCon: 'Mit Regiclass öffnen',
  },
  fr: {
    tipoDiFile: 'Année scolaire Regiclass',
    apriCon: 'Ouvrir avec Regiclass',
  },
  en: {
    tipoDiFile: 'Regiclass school year',
    apriCon: 'Open with Regiclass',
  },
})

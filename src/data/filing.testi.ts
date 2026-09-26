// I testi di `filing.ts`: il rifiuto di archiviare senza un anno aperto.
// I nomi dei documenti stampati stanno in `domain/locations.testi.ts`; le
// cartelle sotto `archivio/` non cambiano con la lingua.

import { catalogo } from '../i18n/index.js'

const it = {
  nessunAnno: 'Nessun anno aperto.',
}

export const testi = catalogo(it, {
  de: {
    nessunAnno: 'Kein Schuljahr geöffnet.',
  },
  fr: {
    nessunAnno: 'Aucune année scolaire ouverte.',
  },
  en: {
    nessunAnno: 'No school year open.',
  },
})

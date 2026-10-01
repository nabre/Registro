// I testi di `filing.ts`: il rifiuto di archiviare senza un anno aperto.
// I nomi dei documenti stampati stanno in `domain/locations.testi.ts`; le
// cartelle sotto `archivio/` non cambiano con la lingua.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nessunAnno: 'Nessun anno aperto.',
  impossibileLeggere: 'Impossibile leggere il file da copiare.',
}

export const testi = catalogo(it, {
  de: {
    nessunAnno: 'Kein Schuljahr geöffnet.',
    impossibileLeggere: 'Die zu kopierende Datei kann nicht gelesen werden.',
  },
  fr: {
    nessunAnno: 'Aucune année scolaire ouverte.',
    impossibileLeggere: 'Impossible de lire le fichier à copier.',
  },
  en: {
    nessunAnno: 'No school year open.',
    impossibileLeggere: 'Unable to read the file to copy.',
  },
})

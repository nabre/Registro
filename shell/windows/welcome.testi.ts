// I testi che il main process manda al benvenuto: l'invito sopra l'elenco e la
// versione in fondo. Il resto della pagina ha il suo catalogo, accanto a lei.

import { catalogo } from '../../src/i18n/index.js'

const it = {
  /** `estensione` è quella dei documenti, punto compreso: «.regi». */
  invito: (estensione: string) =>
    'Il registro lavora su un documento per anno scolastico — un file «' + estensione + '». ' +
    'Riapri quello di ieri, aprine un altro, oppure creane uno nuovo.',
  versione: (versione: string) => `Versione ${versione}`,
}

export const testi = catalogo(it, {
  de: {
    invito: (estensione) =>
      `Das Klassenbuch arbeitet mit einem Dokument pro Schuljahr — einer «${estensione}»-Datei. ` +
      'Öffne das von gestern wieder, öffne ein anderes oder lege ein neues an.',
    versione: (versione) => `Version ${versione}`,
  },
  fr: {
    invito: (estensione) =>
      `Le registre travaille sur un document par année scolaire — un fichier « ${estensione} ». ` +
      'Rouvre celui d’hier, ouvre-en un autre, ou crées-en un nouveau.',
    versione: (versione) => `Version ${versione}`,
  },
  en: {
    invito: (estensione) =>
      `The register works on one document per school year — a “${estensione}” file. ` +
      'Reopen yesterday’s, open another one, or create a new one.',
    versione: (versione) => `Version ${versione}`,
  },
})

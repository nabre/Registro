// I testi del percorso (`breadcrumb.ts`): come si chiama ogni anello per chi
// lo sente leggere a voce.

import { catalogo } from '../i18n/index.js'

const it = {
  ruoli: {
    mestiere: 'Area',
    contesto: 'Su che cosa',
    pagina: 'Pagina',
    elemento: 'Aperto',
    porzione: 'Scheda',
    sezione: 'Sezione',
  },
  percorso: (passi: string) => `Percorso: ${passi}`,
}

export const testi = catalogo(it, {
  de: {
    ruoli: {
      mestiere: 'Bereich',
      contesto: 'Worum es geht',
      pagina: 'Seite',
      elemento: 'Geöffnet',
      porzione: 'Reiter',
      sezione: 'Abschnitt',
    },
    percorso: (passi) => `Pfad: ${passi}`,
  },
  fr: {
    ruoli: {
      mestiere: 'Domaine',
      contesto: 'Sur quoi',
      pagina: 'Page',
      elemento: 'Ouvert',
      porzione: 'Onglet',
      sezione: 'Section',
    },
    percorso: (passi) => `Chemin : ${passi}`,
  },
  en: {
    ruoli: {
      mestiere: 'Area',
      contesto: 'Working on',
      pagina: 'Page',
      elemento: 'Open',
      porzione: 'Tab',
      sezione: 'Section',
    },
    percorso: (passi) => `Path: ${passi}`,
  },
})

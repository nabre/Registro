// I testi della mappa disegnata (`map.ts`): il suggerimento di un tragitto.

import { catalogo } from '../../i18n/index.js'

const it = {
  tragitto: (chi: string, distanza: string) => `${chi}: da casa al posto di lavoro, ${distanza}`,
}

export const testi = catalogo(it, {
  de: {
    tragitto: (chi, distanza) => `${chi}: von zu Hause zum Arbeitsort, ${distanza}`,
  },
  fr: {
    tragitto: (chi, distanza) => `${chi} : du domicile au lieu de travail, ${distanza}`,
  },
  en: {
    tragitto: (chi, distanza) => `${chi}: from home to the workplace, ${distanza}`,
  },
})

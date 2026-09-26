// I testi della cornice dei documenti (`frame.ts`).

import { catalogo } from '../../i18n/index.js'

const it = {
  anteprima: (titolo: string) => `Anteprima di ${titolo}`,
}

export const testi = catalogo(it, {
  de: {
    anteprima: (titolo) => `Vorschau von ${titolo}`,
  },
  fr: {
    anteprima: (titolo) => `Aperçu de ${titolo}`,
  },
  en: {
    anteprima: (titolo) => `Preview of ${titolo}`,
  },
})

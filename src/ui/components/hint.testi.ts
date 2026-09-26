// I testi dei suggerimenti (`hint.ts`): il nome del segno «i» per chi legge
// con la voce.

import { catalogo } from '../../i18n/index.js'

const it = {
  spiegazione: 'Spiegazione',
  spiegazioneDi: (di: string) => `Spiegazione: ${di}`,
}

export const testi = catalogo(it, {
  de: {
    spiegazione: 'Erklärung',
    spiegazioneDi: (di) => `Erklärung: ${di}`,
  },
  fr: {
    spiegazione: 'Explication',
    spiegazioneDi: (di) => `Explication : ${di}`,
  },
  en: {
    spiegazione: 'Explanation',
    spiegazioneDi: (di) => `Explanation: ${di}`,
  },
})

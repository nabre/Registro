// I testi delle scelte a figure (`settings/figures.ts`): le note sotto
// «Sistema» di tema e lingua. Nomi e frasi delle scelte vengono dal manifesto.

import { catalogo } from '../../../i18n/index.js'

const it = {
  comeWindows: (scuro: boolean) => `adesso: ${scuro ? 'scuro' : 'chiaro'}, come Windows`,
  /** Il nome della lingua arriva come la lingua chiama sé stessa: «Deutsch». */
  linguaAdesso: (nome: string) => `adesso: ${nome}, come Windows`,
}

export const testi = catalogo(it, {
  de: {
    comeWindows: (scuro) => `jetzt: ${scuro ? 'dunkel' : 'hell'}, wie Windows`,
    linguaAdesso: (nome) => `jetzt: ${nome}, wie Windows`,
  },
  fr: {
    comeWindows: (scuro) => `en ce moment : ${scuro ? 'sombre' : 'clair'}, comme Windows`,
    linguaAdesso: (nome) => `en ce moment : ${nome}, comme Windows`,
  },
  en: {
    comeWindows: (scuro) => `now: ${scuro ? 'dark' : 'light'}, like Windows`,
    linguaAdesso: (nome) => `now: ${nome}, like Windows`,
  },
})

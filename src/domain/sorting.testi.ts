// I testi di `sorting.ts`: le pagine scelte di una scansione, dette a voce.

import { catalogo } from '../i18n/index.js'

const it = {
  nessunaPagina: 'nessuna pagina',
  /** «pagina 4»: una pagina sola. */
  pagina: (quali: string) => `pagina ${quali}`,
  /** «pagine 2–3 e 7». */
  pagine: (quali: string) => `pagine ${quali}`,
}

export const testi = catalogo(it, {
  de: {
    nessunaPagina: 'keine Seite',
    pagina: (quali) => `Seite ${quali}`,
    pagine: (quali) => `Seiten ${quali}`,
  },
  fr: {
    nessunaPagina: 'aucune page',
    pagina: (quali) => `page ${quali}`,
    pagine: (quali) => `pages ${quali}`,
  },
  en: {
    nessunaPagina: 'no pages',
    pagina: (quali) => `page ${quali}`,
    pagine: (quali) => `pages ${quali}`,
  },
})

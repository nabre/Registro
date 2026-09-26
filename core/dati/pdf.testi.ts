// Che cosa dice il lettore di PDF quando una richiesta non vuol dire niente.

import { catalogo } from '../i18n/index.js'

const it = {
  nessunaPagina: 'Nessuna pagina da ritagliare.',
}

export const testi = catalogo(it, {
  de: { nessunaPagina: 'Keine Seite zum Ausschneiden.' },
  fr: { nessunaPagina: 'Aucune page à découper.' },
  en: { nessunaPagina: 'No page to cut out.' },
})

// I testi della pagina dei dialoghi: i pulsanti, e l'elenco vuoto.
//
// «Annulla» è una parola di tutti, ma una pagina nativa non può importare
// `parole()` (da fuori di `shell/pages/` prende solo tipi e `src/i18n/`): la
// scrive qui, con le stesse traduzioni.

import { catalogo } from '../../../src/i18n/index.js'

const it = {
  vaBene: 'Va bene',
  nienteCorrisponde: 'Niente che corrisponda.',
}

export const testi = catalogo(it, {
  de: { vaBene: 'OK', nienteCorrisponde: 'Nichts passt.' },
  fr: { vaBene: 'OK', nienteCorrisponde: 'Rien ne correspond.' },
  en: { vaBene: 'OK', nienteCorrisponde: 'Nothing matches.' },
})

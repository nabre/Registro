// I testi delle righe delle impostazioni dell'anno (`yearSetting.ts`) e della
// notifica con «Annulla» (`undoable.ts`; il nome del pulsante è quello del
// comando che disfa l'ultimo gesto, `commands.testi.ts`).

import { catalogo } from '#core/i18n/index.js'

const it = {
  avanzate: (quante: number) => `Avanzate (${quante})`,
  annullaAiuto: 'Rimette com’era prima',
}

export const testi = catalogo(it, {
  de: {
    avanzate: (quante) => `Erweitert (${quante})`,
    annullaAiuto: 'Stellt den Zustand von vorher wieder her',
  },
  fr: {
    avanzate: (quante) => `Avancé (${quante})`,
    annullaAiuto: 'Remet comme avant',
  },
  en: {
    avanzate: (quante) => `Advanced (${quante})`,
    annullaAiuto: 'Puts it back as it was',
  },
})

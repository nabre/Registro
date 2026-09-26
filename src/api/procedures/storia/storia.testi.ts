// I testi delle procedure di `storia`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  annulla: {
    titolo: 'Annulla l’ultimo gesto fatto sul registro dal pannello',
  },
  ripristina: {
    titolo: 'Rifà l’ultimo gesto annullato sul registro',
  },
}

export const testi = catalogo(it, {
  de: {
    annulla: {
      titolo:
        'Macht die letzte Handlung im Klassenbuch rückgängig, die über das Fenster ' +
        'gemacht wurde',
    },
    ripristina: {
      titolo: 'Stellt die letzte rückgängig gemachte Handlung am Klassenbuch wieder her',
    },
  },
  fr: {
    annulla: {
      titolo: 'Annule le dernier geste fait sur le registre depuis le panneau',
    },
    ripristina: {
      titolo: 'Refait le dernier geste annulé sur le registre',
    },
  },
  en: {
    annulla: {
      titolo: 'Undoes the last action taken on the register from the panel',
    },
    ripristina: {
      titolo: 'Redoes the last undone action on the register',
    },
  },
})

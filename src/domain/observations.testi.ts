// I testi della matrice del comportamento riletta (`observations.ts`): come si
// chiamano i due segni, a schermo e sulla carta.

import { catalogo } from '../i18n/index.js'

const it = {
  positivo: 'Molto bene',
  negativo: 'Da migliorare',
  nessuno: 'Niente da segnare',
}

export const testi = catalogo(it, {
  de: {
    positivo: 'Sehr gut',
    negativo: 'Zu verbessern',
    nessuno: 'Nichts festzuhalten',
  },
  fr: {
    positivo: 'Très bien',
    negativo: 'À améliorer',
    nessuno: 'Rien à signaler',
  },
  en: {
    positivo: 'Very good',
    negativo: 'Needs work',
    nessuno: 'Nothing to note',
  },
})

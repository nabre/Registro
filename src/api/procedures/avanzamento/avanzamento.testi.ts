// I testi di `avanzamento.imposta`. Si leggono al momento dell'uso
// (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  imposta: {
    titolo: 'Come è andata una tappa della scaletta in quell’ora',
    attivitaId: 'La tappa del piano assegnato all’ora',
    nota: 'Lasciata fuori, resta quel che c’era',
  },
}

export const testi = catalogo(it, {
  de: {
    imposta: {
      titolo: 'Wie eine Etappe des Ablaufs in dieser Stunde gelaufen ist',
      attivitaId: 'Die Etappe des Unterrichtsplans, der dieser Stunde zugewiesen ist',
      nota: 'Weggelassen, bleibt, was vorher da war',
    },
  },
  fr: {
    imposta: {
      titolo: 'Comment s’est passée une étape du déroulement pendant cette leçon',
      attivitaId: 'L’étape du plan de leçon attribué à la leçon',
      nota: 'Si on l’omet, ce qu’il y avait reste',
    },
  },
  en: {
    imposta: {
      titolo: 'How a step of the outline went in that lesson',
      attivitaId: 'The step of the lesson plan assigned to the lesson',
      nota: 'If left out, whatever was there stays',
    },
  },
})

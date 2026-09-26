// I testi di `orphans.ts`: perché un momento di valutazione non è agganciato a
// nessuna tappa.

import { catalogo } from '../i18n/index.js'

const it = {
  'senza-piano': 'non viene da nessun piano lezione',
  'senza-tappa': 'viene da un piano, ma non si sa da quale tappa',
  'piano-sparito': 'il piano da cui veniva non esiste più',
  'tappa-sparita': 'la tappa da cui veniva non è più nella scaletta',
  'tappa-non-valuta': 'la sua tappa non è più una valutazione',
}

export const testi = catalogo(it, {
  de: {
    'senza-piano': 'stammt aus keinem Unterrichtsplan',
    'senza-tappa': 'stammt aus einem Plan, aber man weiss nicht, aus welcher Etappe',
    'piano-sparito': 'der Plan, aus dem sie stammte, existiert nicht mehr',
    'tappa-sparita': 'die Etappe, aus der sie stammte, steht nicht mehr im Ablauf',
    'tappa-non-valuta': 'ihre Etappe ist keine Beurteilung mehr',
  },
  fr: {
    'senza-piano': 'ne vient d’aucun plan de leçon',
    'senza-tappa': 'vient d’un plan, mais on ne sait pas de quelle étape',
    'piano-sparito': 'le plan d’où elle venait n’existe plus',
    'tappa-sparita': 'l’étape d’où elle venait n’est plus dans le déroulement',
    'tappa-non-valuta': 'son étape n’est plus une évaluation',
  },
  en: {
    'senza-piano': 'doesn’t come from any lesson plan',
    'senza-tappa': 'comes from a plan, but it’s not known which step',
    'piano-sparito': 'the plan it came from no longer exists',
    'tappa-sparita': 'the step it came from is no longer in the outline',
    'tappa-non-valuta': 'its step is no longer an assessment',
  },
})

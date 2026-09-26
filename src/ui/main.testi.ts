// I testi della pagina principale (`main.ts`): quel che si dice quando un
// comando del menu nativo non si può eseguire così com'è.

import { catalogo } from '../i18n/index.js'

const it = {
  finestraAperta:
    'C’è una finestra aperta: prima la si chiude, poi si va altrove.',
  pianoDallOra:
    'Un piano si prepara dalla lezione che lo aspetta: scegline una senza scaletta nell’elenco.',
  momentoDallaTappa:
    'Un momento di valutazione nasce dalla tappa del piano, dentro la lezione in cui si fa la ' +
    'prova.',
}

export const testi = catalogo(it, {
  de: {
    finestraAperta:
      'Es ist ein Fenster offen: Zuerst schliessen, dann woandershin gehen.',
    pianoDallOra:
      'Ein Plan wird von der Stunde aus vorbereitet, die auf ihn wartet: Wähle in der Liste eine ' +
      'ohne Ablauf.',
    momentoDallaTappa:
      'Eine Leistungsbeurteilung entsteht aus der Etappe des Plans, in der Stunde, in der ' +
      'die Prüfung stattfindet.',
  },
  fr: {
    finestraAperta:
      'Une fenêtre est ouverte : on la ferme d’abord, puis on va ailleurs.',
    pianoDallOra:
      'Un plan se prépare depuis la leçon qui l’attend : choisis-en une sans déroulement dans la ' +
      'liste.',
    momentoDallaTappa:
      'Une évaluation naît de l’étape du plan, dans la leçon où se fait l’épreuve.',
  },
  en: {
    finestraAperta: 'A window is open: close it first, then go elsewhere.',
    pianoDallOra:
      'A plan is prepared from the lesson waiting for it: choose one without an outline in the ' +
      'list.',
    momentoDallaTappa:
      'An assessment comes from the plan’s step, inside the lesson where the test takes place.',
  },
})

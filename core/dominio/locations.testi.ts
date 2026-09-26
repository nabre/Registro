// I nomi dei documenti stampati nei file di `esportazioni/` (`locations.ts`):
// cambiano con la lingua. Le cartelle che il registro deve ritrovare (radici,
// piani in `archivio/`) non stanno qui perché non cambiano mai nome.

import { catalogo } from '../i18n/index.js'

const it = {
  documenti: {
    verbali: 'Verbali',
    piani: 'Piani',
    presenze: 'Presenze',
    valutazioni: 'Valutazioni',
    prove: 'Prove',
    fascicolo: 'Fascicolo',
    fotoClasse: 'Foto della classe',
  },
}

export const testi = catalogo(it, {
  de: {
    documenti: {
      verbali: 'Protokolle',
      piani: 'Pläne',
      presenze: 'Präsenzliste',
      valutazioni: 'Beurteilungen',
      prove: 'Prüfungen',
      fascicolo: 'Klassendossier',
      fotoClasse: 'Klassenfoto',
    },
  },
  fr: {
    documenti: {
      verbali: 'Procès-verbaux',
      piani: 'Plans',
      presenze: 'Présences',
      valutazioni: 'Évaluations',
      prove: 'Épreuves',
      fascicolo: 'Dossier de classe',
      fotoClasse: 'Photo de classe',
    },
  },
  en: {
    documenti: {
      verbali: 'Lesson records',
      piani: 'Plans',
      presenze: 'Attendance',
      valutazioni: 'Assessments',
      prove: 'Tests',
      fascicolo: 'Class file',
      fotoClasse: 'Class photo',
    },
  },
})

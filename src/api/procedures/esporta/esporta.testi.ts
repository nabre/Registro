// I testi delle procedure di `esporta`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  comune: {
    semestre: 'Il semestre da esportare; null è l’anno intero',
  },
  lezione: {
    titolo: 'Il verbale di un’ora in testo, accanto al suo PDF',
  },
  presenze: {
    titolo: 'Le presenze di un corso in CSV, con il denominatore del PDF',
  },
  valutazioni: {
    titolo: 'Le valutazioni di un corso in CSV, accanto al PDF',
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      semestre: 'Das zu exportierende Semester; null ist das ganze Jahr',
    },
    lezione: {
      titolo: 'Das Protokoll einer Stunde als Text, neben seinem PDF',
    },
    presenze: {
      titolo: 'Die Anwesenheiten eines Kurses als CSV, mit demselben Nenner wie das PDF',
    },
    valutazioni: {
      titolo: 'Die Beurteilungen eines Kurses als CSV, neben dem PDF',
    },
  },
  fr: {
    comune: {
      semestre: 'Le semestre à exporter ; null correspond à l’année entière',
    },
    lezione: {
      titolo: 'Le procès-verbal d’une leçon en texte, à côté de son PDF',
    },
    presenze: {
      titolo: 'Les présences d’un cours en CSV, avec le même dénominateur que le PDF',
    },
    valutazioni: {
      titolo: 'Les évaluations d’un cours en CSV, à côté du PDF',
    },
  },
  en: {
    comune: {
      semestre: 'The semester to export; null is the whole year',
    },
    lezione: {
      titolo: 'The lesson record of a lesson as text, next to its PDF',
    },
    presenze: {
      titolo: 'A course’s attendance as CSV, with the same denominator as the PDF',
    },
    valutazioni: {
      titolo: 'A course’s assessments as CSV, next to the PDF',
    },
  },
})

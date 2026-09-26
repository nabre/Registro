// I testi delle procedure di `rapporti`. Si leggono al momento dell'uso, mai
// al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  completo: {
    titolo: 'Tutti i fogli di un corso, o di tutti i corsi dell’anno',
    corsoId: 'null: tutti i corsi dell’anno aperto',
    semestreId: 'null: l’anno intero',
  },
  genera: {
    titolo: 'Compone un rapporto in PDF e dice dove lo ha messo',
    genere: 'Quale degli otto fogli',
    id: 'Di che cosa: la lezione, il piano, il corso, la classe, la persona',
    corsoId: 'Solo per la scheda della persona: di quale corso parla',
    semestreId: 'Solo per valutazioni e scheda: il periodo da guardare',
  },
}

export const testi = catalogo(it, {
  de: {
    completo: {
      titolo: 'Alle Blätter eines Kurses oder aller Kurse des Jahres',
      corsoId: 'null: alle Kurse des geöffneten Jahres',
      semestreId: 'null: das ganze Jahr',
    },
    genera: {
      titolo: 'Erstellt einen Bericht als PDF und sagt, wo er abgelegt wurde',
      genere: 'Welches der acht Blätter',
      id: 'Wovon: die Stunde, der Plan, der Kurs, die Klasse, die Person',
      corsoId: 'Nur für das Personenblatt: um welchen Kurs es geht',
      semestreId: 'Nur für Beurteilungen und Personenblatt: der zu betrachtende Zeitraum',
    },
  },
  fr: {
    completo: {
      titolo: 'Toutes les feuilles d’un cours, ou de tous les cours de l’année',
      corsoId: 'null : tous les cours de l’année ouverte',
      semestreId: 'null : l’année entière',
    },
    genera: {
      titolo: 'Compose un rapport en PDF et indique où il l’a mis',
      genere: 'Laquelle des huit feuilles',
      id: 'De quoi : la leçon, le plan, le cours, la classe, la personne',
      corsoId: 'Seulement pour la fiche de la personne : de quel cours elle parle',
      semestreId: 'Seulement pour les évaluations et la fiche : la période à considérer',
    },
  },
  en: {
    completo: {
      titolo: 'All the sheets of a course, or of every course in the year',
      corsoId: 'null: every course in the open year',
      semestreId: 'null: the whole year',
    },
    genera: {
      titolo: 'Composes a PDF report and says where it put it',
      genere: 'Which of the eight sheets',
      id: 'Of what: the lesson, the plan, the course, the class, the person',
      corsoId: 'Only for the person’s sheet: which course it is about',
      semestreId: 'Only for assessments and the sheet: the period to look at',
    },
  },
})

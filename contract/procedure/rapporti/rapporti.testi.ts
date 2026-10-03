// I testi delle procedure di `rapporti`. Si leggono al momento dell'uso, mai
// al caricamento.

import { catalogo } from '#core/i18n/index.js'

const it = {
  completo: {
    titolo: 'Tutti i fogli di un corso, o di tutti i corsi dell’anno',
    corsoId: 'null: tutti i corsi dell’anno aperto',
    semestreId: 'null: l’anno intero',
  },
  genera: {
    titolo: 'Compone un rapporto in PDF e dice dove lo ha messo',
    genere: 'Quale foglio',
    id: 'Di che cosa: la lezione, il piano, il corso, la classe, la persona, il progetto',
    corsoId: 'Per la scheda della persona e per i fogli del progetto: di quale corso parla',
    progettoSenzaCorso: 'I fogli del progetto sono del lavoro con una classe: serve il corso (corsoId).',
    semestreId: 'Solo per valutazioni e scheda: il periodo da guardare',
    docenteDiClasse: 'Se vero genera la scheda del docente di classe',
    allievoId: 'Solo per il rapporto individuale del progetto: la persona',
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
      genere: 'Welches Blatt',
      id: 'Wovon: die Stunde, der Plan, der Kurs, die Klasse, die Person, das Projekt',
      corsoId: 'Für das Personenblatt und die Projektblätter: um welchen Kurs es geht',
      progettoSenzaCorso: 'Die Projektblätter gelten der Arbeit mit einer Klasse: Der Kurs (corsoId) ist nötig.',
      semestreId: 'Nur für Beurteilungen und Personenblatt: der zu betrachtende Zeitraum',
      docenteDiClasse: 'Wenn wahr, wird das Blatt der Klassenlehrperson erstellt',
      allievoId: 'Nur für den persönlichen Projektbericht: die Person',
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
      genere: 'Quelle feuille',
      id: 'De quoi : la leçon, le plan, le cours, la classe, la personne, le projet',
      corsoId: 'Pour la fiche de la personne et les feuilles du projet : de quel cours il s’agit',
      progettoSenzaCorso: 'Les feuilles du projet portent sur le travail avec une classe : il faut le cours (corsoId).',
      semestreId: 'Seulement pour les évaluations et la fiche : la période à considérer',
      docenteDiClasse: 'Si vrai, génère la fiche du maître de classe',
      allievoId: 'Seulement pour le rapport individuel du projet : la personne',
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
      genere: 'Which sheet',
      id: 'Of what: the lesson, the plan, the course, the class, the person, the project',
      corsoId: 'For the person’s sheet and the project sheets: which course it is about',
      progettoSenzaCorso: 'Project sheets are about the work with a class: the course (corsoId) is needed.',
      semestreId: 'Only for assessments and the sheet: the period to look at',
      docenteDiClasse: 'If true, generates the class teacher sheet',
      allievoId: 'Only for the individual project report: the person',
    },
  },
})

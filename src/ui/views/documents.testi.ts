// I testi del telaio della pagina Documenti (`documents.ts`).

import { catalogo } from '../../i18n/index.js'

const it = {
  vuotoAnno: 'I documenti escono da un corso, e un corso sta dentro un anno.',
  aiuto: 'quel che esce dal registro e va in mano ad altri',
  nessunCorso: 'Nessun corso',
  nessunCorsoTesto:
    'I documenti sono di un corso: le ore che si contano e la media in fondo alla ' +
    'griglia sono le sue. Senza corsi non c’è niente da stampare — i corsi si fanno ' +
    'nella pagina Corsi.',
}

export const testi = catalogo(it, {
  de: {
    vuotoAnno: 'Die Dokumente entstehen aus einem Kurs, und ein Kurs gehört zu einem Schuljahr.',
    aiuto: 'was das Klassenbuch verlässt und in andere Hände geht',
    nessunCorso: 'Kein Kurs',
    nessunCorsoTesto:
      'Die Dokumente gehören zu einem Kurs: Die gezählten Stunden und der Durchschnitt unten in ' +
      'der Tabelle sind seine. Ohne Kurse gibt es nichts zu drucken — Kurse legt man auf der ' +
      'Seite Kurse an.',
  },
  fr: {
    vuotoAnno: 'Les documents sortent d’un cours, et un cours se trouve dans une année.',
    aiuto: 'ce qui sort du registre et passe dans d’autres mains',
    nessunCorso: 'Aucun cours',
    nessunCorsoTesto:
      'Les documents appartiennent à un cours : les leçons comptées et la moyenne au bas de la ' +
      'grille sont les siennes. Sans cours, il n’y a rien à imprimer — les cours se créent dans ' +
      'la page Cours.',
  },
  en: {
    vuotoAnno: 'Documents come from a course, and a course sits inside a year.',
    aiuto: 'what leaves the register and goes into other people’s hands',
    nessunCorso: 'No courses',
    nessunCorsoTesto:
      'Documents belong to a course: the lessons counted and the average at the foot of the grid ' +
      'are its own. Without courses there’s nothing to print — courses are made on the ' +
      'Courses page.',
  },
})

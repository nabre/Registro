// I testi di `vista.apri`. I nomi delle pagine fra virgolette sono valori del
// campo e restano uguali.

import { catalogo } from '../../../i18n/index.js'

const it = {
  apri: {
    titolo: 'Porta il registro su una pagina, con la cosa da mostrarci dentro',
    vista:
      'La pagina da aprire: «lezione» è il registro dell’ora, «corsi» l’elenco dei corsi, ' +
      '«classi» le classi, «valutazioni» i momenti di valutazione, «calendario» l’agenda',
    elementoId: 'La cosa da mostrare in quella pagina: l’ora, il corso, la classe, la persona',
    data: 'Il giorno su cui aprirla: vale per il calendario e per le pagine che ne hanno uno',
  },
}

export const testi = catalogo(it, {
  de: {
    apri: {
      titolo: 'Bringt das Klassenbuch auf eine Seite, mit dem, was darin zu zeigen ist',
      vista:
        'Die zu öffnende Seite: «lezione» ist das Klassenbuch der Stunde, «corsi» ' +
        'die Liste der Kurse, «classi» die Klassen, «valutazioni» die Leistungsbeurteilungen, ' +
        '«calendario» die Agenda',
      elementoId:
        'Was auf dieser Seite zu zeigen ist: die Stunde, der Kurs, die Klasse, ' +
        'die Person',
      data:
        'Der Tag, an dem sie geöffnet wird: gilt für den Kalender und für die Seiten, die ' +
        'einen haben',
    },
  },
  fr: {
    apri: {
      titolo: 'Amène le registre sur une page, avec ce qu’il faut y montrer',
      vista:
        'La page à ouvrir : « lezione » est le registre de la leçon, « corsi » la ' +
        'liste des cours, « classi » les classes, « valutazioni » les évaluations, ' +
        '« calendario » l’agenda',
      elementoId:
        'Ce qu’il faut montrer sur cette page : la leçon, le cours, la classe, la ' +
        'personne',
      data:
        'Le jour sur lequel l’ouvrir : vaut pour le calendrier et pour les pages qui en ont un',
    },
  },
  en: {
    apri: {
      titolo: 'Takes the register to a page, with the thing to show in it',
      vista:
        'The page to open: “lezione” is the lesson’s register, “corsi” the list of ' +
        'courses, “classi” the classes, “valutazioni” the assessments, “calendario” the planner',
      elementoId:
        'The thing to show on that page: the lesson, the course, the class, the person',
      data: 'The day to open it on: applies to the calendar and to the pages that have one',
    },
  },
})

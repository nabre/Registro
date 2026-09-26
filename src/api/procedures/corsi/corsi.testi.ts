// I testi delle procedure di `corsi`. Si leggono al momento dell'uso
// (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  crea: {
    titolo: 'Apre un corso: questa materia, a questa classe',
    titoloCorso: 'Senza, lo compone il dominio da classe e materia',
  },
  elimina: {
    titolo: 'Toglie un corso con le sue ore, i suoi voti e le sue consegne',
  },
  salva: {
    titolo: 'Scrive un corso intero, nuovo o già esistente',
  },
  elenco: {
    titolo: 'I corsi dell’anno: classe, materia, quante ore a calendario',
    annoId: 'Senza, l’anno in uso',
    classeId: 'Solo i corsi di questa classe',
    materiaId: 'Solo i corsi di questa materia',
    dove: 'titolo, classe o materia',
    annoIdUscita: 'L’anno di cui sono i corsi',
    anno: 'Come si chiama: «2026/2027». Vuoto se non c’è nessun anno',
    allievi: 'Quante persone frequentano',
    fasce: 'Le fasce orarie fisse dichiarate',
    presentazione: {
      titolo: 'I corsi dell’anno',
      anno: 'Anno scolastico',
      classe: 'Classe',
      materia: 'Materia',
      persone: 'Persone',
      ore: 'Ore',
      fasce: 'Fasce',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    crea: {
      titolo: 'Eröffnet einen Kurs: dieses Fach für diese Klasse',
      titoloCorso: 'Ohne: wird aus Klasse und Fach zusammengesetzt',
    },
    elimina: {
      titolo: 'Entfernt einen Kurs mit seinen Stunden, Noten und Aufträgen',
    },
    salva: {
      titolo: 'Schreibt einen ganzen Kurs, neu oder bereits vorhanden',
    },
    elenco: {
      titolo: 'Die Kurse des Jahres: Klasse, Fach, wie viele Stunden im Kalender',
      annoId: 'Ohne: das laufende Jahr',
      classeId: 'Nur die Kurse dieser Klasse',
      materiaId: 'Nur die Kurse dieses Fachs',
      dove: 'Titel, Klasse oder Fach',
      annoIdUscita: 'Das Jahr, zu dem die Kurse gehören',
      anno: 'Wie es heisst: «2026/2027». Leer, wenn es kein Jahr gibt',
      allievi: 'Wie viele Personen teilnehmen',
      fasce: 'Die festen Zeitfenster, die angegeben sind',
      presentazione: {
        titolo: 'Die Kurse des Jahres',
        anno: 'Schuljahr',
        classe: 'Klasse',
        materia: 'Fach',
        persone: 'Personen',
        ore: 'Stunden',
        fasce: 'Zeitfenster',
      },
    },
  },
  fr: {
    crea: {
      titolo: 'Ouvre un cours : cette branche, pour cette classe',
      titoloCorso: 'Sans : composé à partir de la classe et de la branche',
    },
    elimina: {
      titolo: 'Supprime un cours avec ses leçons, ses notes et ses devoirs',
    },
    salva: {
      titolo: 'Écrit un cours entier, nouveau ou déjà existant',
    },
    elenco: {
      titolo: 'Les cours de l’année : classe, branche, combien de leçons au calendrier',
      annoId: 'Sans : l’année en cours',
      classeId: 'Seulement les cours de cette classe',
      materiaId: 'Seulement les cours de cette branche',
      dove: 'titre, classe ou branche',
      annoIdUscita: 'L’année à laquelle appartiennent les cours',
      anno: 'Comment elle s’appelle : « 2026/2027 ». Vide s’il n’y a aucune année',
      allievi: 'Combien de personnes le suivent',
      fasce: 'Les plages horaires fixes déclarées',
      presentazione: {
        titolo: 'Les cours de l’année',
        anno: 'Année scolaire',
        classe: 'Classe',
        materia: 'Branche',
        persone: 'Personnes',
        ore: 'Leçons',
        fasce: 'Plages',
      },
    },
  },
  en: {
    crea: {
      titolo: 'Opens a course: this subject, for this class',
      titoloCorso: 'Without it, it is built from class and subject',
    },
    elimina: {
      titolo: 'Removes a course with its lessons, its grades and its assignments',
    },
    salva: {
      titolo: 'Writes a whole course, new or already existing',
    },
    elenco: {
      titolo: 'The courses of the year: class, subject, how many lessons on the calendar',
      annoId: 'Without it, the current year',
      classeId: 'Only the courses of this class',
      materiaId: 'Only the courses of this subject',
      dove: 'title, class or subject',
      annoIdUscita: 'The year the courses belong to',
      anno: 'What it is called: “2026/2027”. Empty if there is no year',
      allievi: 'How many people attend',
      fasce: 'The fixed time slots declared',
      presentazione: {
        titolo: 'The courses of the year',
        anno: 'School year',
        classe: 'Class',
        materia: 'Subject',
        persone: 'People',
        ore: 'Lessons',
        fasce: 'Slots',
      },
    },
  },
})

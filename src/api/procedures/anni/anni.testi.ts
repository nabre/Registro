// I testi delle procedure di `anni`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  crea: {
    titolo: 'Crea il documento di un anno scolastico nuovo',
    etichettaPausa: 'Come si chiama la pausa: «Vacanze di Natale»',
    etichetteSemestri: 'I nomi dei due semestri, nell’ordine',
    inizio: 'Il primo giorno dell’anno',
    fine: 'L’ultimo',
    etichetta: 'Come lo si chiama parlando: «2025/2026»',
    confine: 'L’ultimo giorno del primo semestre',
    sospensioni: 'Le pause dichiarate nel modulo: nascono con l’anno, non dopo',
  },
  salva: {
    titolo: 'Riscrive un anno intero: etichetta, semestri e pause',
  },
  settimana: {
    titolo:
      'Segna il tipo della settimana di un giorno (A, B, o un’altra voce della lista), o lo toglie',
    giorno: 'Un giorno qualunque: conta il lunedì che apre la sua settimana',
    lettera:
      'Il valore di una voce della lista «Tipi di settimana» (di norma A o B). ' +
      'null toglie il tipo e lascia la settimana senza',
  },
}

export const testi = catalogo(it, {
  de: {
    crea: {
      titolo: 'Erstellt das Dokument eines neuen Schuljahres',
      etichettaPausa: 'Wie die Pause heisst: «Weihnachtsferien»',
      etichetteSemestri: 'Die Namen der beiden Semester, in ihrer Reihenfolge',
      inizio: 'Der erste Tag des Jahres',
      fine: 'Der letzte',
      etichetta: 'Wie man es im Gespräch nennt: «2025/2026»',
      confine: 'Der letzte Tag des ersten Semesters',
      sospensioni: 'Die im Formular angegebenen Pausen: Sie entstehen mit dem Jahr, nicht danach',
    },
    salva: {
      titolo: 'Schreibt ein ganzes Jahr neu: Bezeichnung, Semester und Pausen',
    },
    settimana: {
      titolo:
        'Setzt den Wochentyp eines Tages (A, B oder ein anderer Eintrag der Liste) oder entfernt ' +
        'ihn',
      giorno: 'Ein beliebiger Tag: Es zählt der Montag, mit dem seine Woche beginnt',
      lettera:
        'Der Wert eines Eintrags der Liste «Wochentypen» (meist A oder B). ' +
        'null entfernt den Typ und lässt die Woche ohne',
    },
  },
  fr: {
    crea: {
      titolo: 'Crée le document d’une nouvelle année scolaire',
      etichettaPausa: 'Comment s’appelle la pause : « Vacances de Noël »',
      etichetteSemestri: 'Les noms des deux semestres, dans l’ordre',
      inizio: 'Le premier jour de l’année',
      fine: 'Le dernier',
      etichetta: 'Comment on l’appelle en parlant : « 2025/2026 »',
      confine: 'Le dernier jour du premier semestre',
      sospensioni:
        'Les pauses déclarées dans le formulaire : elles naissent avec l’année, pas après',
    },
    salva: {
      titolo: 'Réécrit une année entière : libellé, semestres et pauses',
    },
    settimana: {
      titolo:
        'Attribue le type de semaine d’un jour (A, B ou une autre entrée de la liste), ou le ' +
        'retire',
      giorno: 'Un jour quelconque : c’est le lundi qui ouvre sa semaine qui compte',
      lettera:
        'La valeur d’une entrée de la liste « Types de semaine » (en général A ou B). ' +
        'null retire le type et laisse la semaine sans',
    },
  },
  en: {
    crea: {
      titolo: 'Creates the document for a new school year',
      etichettaPausa: 'What the break is called: “Christmas holidays”',
      etichetteSemestri: 'The names of the two semesters, in order',
      inizio: 'The first day of the year',
      fine: 'The last one',
      etichetta: 'What it is called in conversation: “2025/2026”',
      confine: 'The last day of the first semester',
      sospensioni: 'The breaks entered in the form: they are created with the year, not afterwards',
    },
    salva: {
      titolo: 'Rewrites a whole year: label, semesters and breaks',
    },
    settimana: {
      titolo: 'Sets the week type of a day (A, B or another entry in the list), or removes it',
      giorno: 'Any day: what counts is the Monday that starts its week',
      lettera:
        'The value of an entry in the “Week types” list (usually A or B). ' +
        'null removes the type and leaves the week without one',
    },
  },
})

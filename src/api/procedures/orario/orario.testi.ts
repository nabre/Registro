// I testi delle procedure di `orario`. Si leggono al momento dell'uso, mai al
// caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  genera: {
    titolo: 'Mette a calendario le ore che l’orario prevede e non ci sono',
  },
  imposta: {
    titolo: 'Le ore fisse di un corso, senza rimandare indietro il corso intero',
    giorno: '1 = lunedì … 7 = domenica',
    durataMin: 'Quanto dura la fascia, in minuti',
    dal: 'Da quando vale la fascia. Senza, da sempre',
    al: 'Fino a quando. Senza, fino alla fine dell’anno',
    orario: 'Le fasce fisse: l’elenco sostituisce quello di prima, non ci si aggiunge',
  },
}

export const testi = catalogo(it, {
  de: {
    genera: {
      titolo:
        'Trägt die Stunden in den Kalender ein, die der Stundenplan vorsieht und die ' +
        'noch fehlen',
    },
    imposta: {
      titolo: 'Die festen Zeitfenster eines Kurses, ohne den ganzen Kurs zurückzuschicken',
      giorno: '1 = Montag … 7 = Sonntag',
      durataMin: 'Wie lange das Zeitfenster dauert, in Minuten',
      dal: 'Ab wann das Zeitfenster gilt. Ohne Angabe seit jeher',
      al: 'Bis wann. Ohne Angabe bis zum Ende des Jahres',
      orario: 'Die festen Zeitfenster: Die Liste ersetzt die bisherige, sie wird nicht ergänzt',
    },
  },
  fr: {
    genera: {
      titolo: 'Inscrit au calendrier les leçons que l’horaire prévoit et qui manquent',
    },
    imposta: {
      titolo: 'Les plages horaires fixes d’un cours, sans renvoyer le cours entier',
      giorno: '1 = lundi … 7 = dimanche',
      durataMin: 'Combien de temps dure la plage horaire, en minutes',
      dal: 'Depuis quand la plage vaut. Sans, depuis toujours',
      al: 'Jusqu’à quand. Sans, jusqu’à la fin de l’année',
      orario: 'Les plages fixes : la liste remplace la précédente, elle ne s’y ajoute pas',
    },
  },
  en: {
    genera: {
      titolo:
        'Puts in the calendar the lessons the timetable provides for and that are missing',
    },
    imposta: {
      titolo: 'A course’s fixed time slots, without sending back the whole course',
      giorno: '1 = Monday … 7 = Sunday',
      durataMin: 'How long the time slot lasts, in minutes',
      dal: 'From when the slot applies. Without it, always',
      al: 'Until when. Without it, until the end of the year',
      orario: 'The fixed slots: the list replaces the previous one, it is not added to it',
    },
  },
})

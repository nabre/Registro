// I testi delle sezioni delle impostazioni: nomi, fascia in cima, gruppi
// tematici e titoli dei gruppi di chiavi. Etichette e descrizioni delle
// singole impostazioni vengono dal manifesto (`src/manifest.testi.ts`).

import { catalogo } from '../../../i18n/index.js'

/** Una sezione: il nome e il riassunto che si legge passandoci sopra. */
interface Nome {
  titolo: string
  sottotitolo: string
}

const it = {
  programma: {
    aspetto: {
      titolo: 'Generale',
      sottotitolo: 'lingua, tema, avvio, icona accanto all’orologio, promemoria, proiezione',
    },
    // È anche il nome del gruppo che la contiene: la prova vuole che coincidano.
    posta: {
      titolo: 'Comunicazioni',
      sottotitolo:
        'la casella da cui partono le mail, quando si spediscono, la firma, e con che cosa si ' +
        'chiama o si scrive a una persona',
    },
    modelli: {
      titolo: 'Modelli linguistici',
      sottotitolo: 'i modelli sulla tua macchina: assistente, scansioni, dettatura',
    },
    aggiornamenti: {
      titolo: 'Aggiornamenti',
      sottotitolo: 'la versione, e quando arriva quella nuova',
    },
    condotto: {
      titolo: 'Condotto e riga di comando',
      sottotitolo: 'se altri programmi possono parlare con il registro',
    },
  } satisfies Record<string, Nome>,
  avvertenzaCondotto:
    'Qui si concede a **programmi che non sono il registro** di guardarci dentro. Acceso il '
    + 'condotto, ogni programma che gira con il tuo stesso accesso può usarlo senza chiedertelo: '
    + 'non c’è una password e non c’è una domanda. Accendilo per il tempo che serve a quello '
    + 'script, e spegnilo quando hai finito.',
  documento: {
    anno: { titolo: 'Anno scolastico', sottotitolo: 'semestri, chiusure, settimane A e B' },
    calendario: {
      titolo: 'Calendario',
      sottotitolo:
        'l’unità didattica, le pause, l’inizio e la fine della giornata, i giorni mostrati',
    },
    ics: {
      titolo: 'Calendari ICS',
      sottotitolo:
        'l’orario della scuola da un link o da un file, e come riconoscere le lezioni',
    },
    valutazione: {
      titolo: 'Valutazione',
      sottotitolo: 'la scala dei voti, l’arrotondamento di fine semestre, la soglia di assenza',
    },
    materie: { titolo: 'Materie', sottotitolo: 'che cosa si insegna, e in quali corsi finisce' },
    liste: {
      titolo: 'Liste',
      sottotitolo: 'le voci dei menu a tendina: tipi di attività, di prova, supporti',
    },
    intestazione: {
      titolo: 'Intestazione',
      sottotitolo: 'sede, nome, logo e firma che vanno su fogli e mail',
    },
    file: {
      titolo: 'Questo file',
      sottotitolo:
        'dov’è il documento aperto, che cosa contiene, i riferimenti che non tornano',
    },
  } satisfies Record<string, Nome>,
  gruppi: {
    anno: 'Anno e orario',
    didattica: 'Didattica',
    liste: 'Liste',
    stampa: 'Documenti e stampa',
    programma: 'Programma',
  },
  /** I titoli dei gruppi di chiavi dentro una sezione, per prefisso. */
  titoliGruppi: {
    'registroDocenti.aspetto': 'Lingua e tema',
    'registroDocenti.vassoio': 'Icona accanto all’orologio',
    'registroDocenti.avvio': 'Avvio',
    'registroDocenti.promemoria': 'Promemoria delle lezioni',
    'registroDocenti.proiezione': 'Proiezione per la classe',
    'registroDocenti.posta': 'Casella di posta',
    'registroDocenti.recapiti': 'Chiamate e mail dall’anagrafica',
    'registroDocenti.modelli': 'Cartella e scarichi',
    'registroDocenti.ocr': 'Lettura delle scansioni',
    'registroDocenti.assistente': 'Assistente',
    'registroDocenti.dettatura': 'Dettatura',
    'registroDocenti.aggiornamenti': 'Versioni nuove',
    'registroDocenti.api': 'Concessioni del condotto',
  },
}

export const testi = catalogo(it, {
  de: {
    programma: {
      aspetto: {
        titolo: 'Allgemein',
        sottotitolo: 'Sprache, Design, Start, Symbol neben der Uhr, Erinnerungen, Projektion',
      },
      posta: {
        titolo: 'Kommunikation',
        sottotitolo:
          'das Postfach, aus dem die Mails verschickt werden, wann sie verschickt werden, die ' +
          'Signatur, und womit man eine Person anruft oder ihr schreibt',
      },
      modelli: {
        titolo: 'Sprachmodelle',
        sottotitolo: 'die Modelle auf deinem Computer: Assistent, Scans, Diktat',
      },
      aggiornamenti: {
        titolo: 'Aktualisierungen',
        sottotitolo: 'die Version, und wann die neue kommt',
      },
      condotto: {
        titolo: 'Kanal und Befehlszeile',
        sottotitolo: 'ob andere Programme mit dem Klassenbuch sprechen dürfen',
      },
    },
    avvertenzaCondotto:
      'Hier erlaubst du **Programmen, die nicht das Klassenbuch sind**, hineinzuschauen. Ist der '
      + 'Kanal eingeschaltet, kann jedes Programm, das mit deinem Zugang läuft, ihn benutzen, ohne '
      + 'dich zu fragen: Es gibt kein Passwort und keine Rückfrage. Schalte ihn so lange ein, wie '
      + 'das Skript ihn braucht, und schalte ihn aus, wenn du fertig bist.',
    documento: {
      anno: { titolo: 'Schuljahr', sottotitolo: 'Semester, Schliessungen, A- und B-Wochen' },
      calendario: {
        titolo: 'Kalender',
        sottotitolo: 'die Lektion, die Pausen, Beginn und Ende des Tages, die angezeigten Tage',
      },
      ics: {
        titolo: 'ICS-Kalender',
        sottotitolo:
          'der Stundenplan der Schule aus einem Link oder einer Datei, und wie man die ' +
          'Stunden erkennt',
      },
      valutazione: {
        titolo: 'Beurteilung',
        sottotitolo: 'die Notenskala, die Rundung am Semesterende, die Absenzengrenze',
      },
      materie: { titolo: 'Fächer', sottotitolo: 'was unterrichtet wird, und in welchen Kursen' },
      liste: {
        titolo: 'Listen',
        sottotitolo: 'die Einträge der Auswahlmenüs: Arten von Aktivitäten, Prüfungen, Hilfsmittel',
      },
      intestazione: {
        titolo: 'Briefkopf',
        sottotitolo: 'Schule, Name, Logo und Unterschrift auf Blättern und Mails',
      },
      file: {
        titolo: 'Diese Datei',
        sottotitolo:
          'wo das offene Dokument liegt, was es enthält, die Verweise, die nicht aufgehen',
      },
    },
    gruppi: {
      anno: 'Schuljahr und Stundenplan',
      didattica: 'Unterricht',
      liste: 'Listen',
      stampa: 'Dokumente und Druck',
      programma: 'Programm',
    },
    titoliGruppi: {
      'registroDocenti.aspetto': 'Sprache und Design',
      'registroDocenti.vassoio': 'Symbol neben der Uhr',
      'registroDocenti.avvio': 'Start',
      'registroDocenti.promemoria': 'Erinnerungen an die Stunden',
      'registroDocenti.proiezione': 'Projektion für die Klasse',
      'registroDocenti.posta': 'Postfach',
      'registroDocenti.recapiti': 'Anrufe und Mails aus den Personalien',
      'registroDocenti.modelli': 'Ordner und Downloads',
      'registroDocenti.ocr': 'Lesen der Scans',
      'registroDocenti.assistente': 'Assistent',
      'registroDocenti.dettatura': 'Diktat',
      'registroDocenti.aggiornamenti': 'Neue Versionen',
      'registroDocenti.api': 'Freigaben des Kanals',
    },
  },
  fr: {
    programma: {
      aspetto: {
        titolo: 'Général',
        sottotitolo: 'langue, thème, démarrage, icône près de l’horloge, rappels, projection',
      },
      posta: {
        titolo: 'Communications',
        sottotitolo:
          'la boîte d’où partent les e-mails, quand ils partent, la signature, et avec quoi on ' +
          'appelle une personne ou on lui écrit',
      },
      modelli: {
        titolo: 'Modèles de langage',
        sottotitolo: 'les modèles sur ta machine : assistant, scans, dictée',
      },
      aggiornamenti: {
        titolo: 'Mises à jour',
        sottotitolo: 'la version, et quand arrive la nouvelle',
      },
      condotto: {
        titolo: 'Canal et ligne de commande',
        sottotitolo: 'si d’autres programmes peuvent parler avec le registre',
      },
    },
    avvertenzaCondotto:
      'Ici, tu permets à **des programmes qui ne sont pas le registre** de regarder dedans. Le '
      + 'canal allumé, tout programme qui tourne avec ton accès peut l’utiliser sans te le '
      + 'demander : il n’y a ni mot de passe ni question. Allume-le le temps dont ce script a '
      + 'besoin, et éteins-le quand tu as fini.',
    documento: {
      anno: { titolo: 'Année scolaire', sottotitolo: 'semestres, fermetures, semaines A et B' },
      calendario: {
        titolo: 'Calendrier',
        sottotitolo: 'la période, les pauses, le début et la fin de la journée, les jours affichés',
      },
      ics: {
        titolo: 'Calendriers ICS',
        sottotitolo:
          'l’horaire de l’école depuis un lien ou un fichier, et comment reconnaître les leçons',
      },
      valutazione: {
        titolo: 'Évaluation',
        sottotitolo: 'le barème, l’arrondi de fin de semestre, le seuil d’absence',
      },
      materie: { titolo: 'Branches', sottotitolo: 'ce qu’on enseigne, et dans quels cours' },
      liste: {
        titolo: 'Listes',
        sottotitolo: 'les entrées des menus déroulants : types d’activité, d’épreuve, supports',
      },
      intestazione: {
        titolo: 'En-tête',
        sottotitolo: 'école, nom, logo et signature qui figurent sur les feuilles et les e-mails',
      },
      file: {
        titolo: 'Ce fichier',
        sottotitolo:
          'où se trouve le document ouvert, ce qu’il contient, les références qui ne collent pas',
      },
    },
    gruppi: {
      anno: 'Année et horaire',
      didattica: 'Enseignement',
      liste: 'Listes',
      stampa: 'Documents et impression',
      programma: 'Programme',
    },
    titoliGruppi: {
      'registroDocenti.aspetto': 'Langue et thème',
      'registroDocenti.vassoio': 'Icône près de l’horloge',
      'registroDocenti.avvio': 'Démarrage',
      'registroDocenti.promemoria': 'Rappels des leçons',
      'registroDocenti.proiezione': 'Projection pour la classe',
      'registroDocenti.posta': 'Boîte aux lettres',
      'registroDocenti.recapiti': 'Appels et e-mails depuis les données personnelles',
      'registroDocenti.modelli': 'Dossier et téléchargements',
      'registroDocenti.ocr': 'Lecture des scans',
      'registroDocenti.assistente': 'Assistant',
      'registroDocenti.dettatura': 'Dictée',
      'registroDocenti.aggiornamenti': 'Nouvelles versions',
      'registroDocenti.api': 'Autorisations du canal',
    },
  },
  en: {
    programma: {
      aspetto: {
        titolo: 'General',
        sottotitolo: 'language, theme, startup, icon next to the clock, reminders, projection',
      },
      posta: {
        titolo: 'Communications',
        sottotitolo:
          'the mailbox emails are sent from, when they go out, the signature, and what you use ' +
          'to call or write to someone',
      },
      modelli: {
        titolo: 'Language models',
        sottotitolo: 'the models on your computer: assistant, scans, dictation',
      },
      aggiornamenti: {
        titolo: 'Updates',
        sottotitolo: 'the version, and when the new one arrives',
      },
      condotto: {
        titolo: 'Pipe and command line',
        sottotitolo: 'whether other programs may talk to the register',
      },
    },
    avvertenzaCondotto:
      'Here you let **programs that are not the register** look inside. With the pipe on, any '
      + 'program running under your account can use it without asking you: there is no password '
      + 'and no question. Turn it on for as long as that script needs it, and turn it off when '
      + 'you are done.',
    documento: {
      anno: { titolo: 'School year', sottotitolo: 'semesters, closures, A and B weeks' },
      calendario: {
        titolo: 'Calendar',
        sottotitolo: 'the period, the breaks, the start and end of the day, the days shown',
      },
      ics: {
        titolo: 'ICS calendars',
        sottotitolo: 'the school timetable from a link or a file, and how to recognise lessons',
      },
      valutazione: {
        titolo: 'Assessment',
        sottotitolo: 'the grading scale, end-of-semester rounding, the absence threshold',
      },
      materie: { titolo: 'Subjects', sottotitolo: 'what is taught, and in which courses' },
      liste: {
        titolo: 'Lists',
        sottotitolo: 'the entries of the drop-down menus: types of activity, of test, materials',
      },
      intestazione: {
        titolo: 'Letterhead',
        sottotitolo: 'school, name, logo and signature that go on sheets and emails',
      },
      file: {
        titolo: 'This file',
        sottotitolo:
          'where the open document is, what it contains, the references that don’t add up',
      },
    },
    gruppi: {
      anno: 'Year and timetable',
      didattica: 'Teaching',
      liste: 'Lists',
      stampa: 'Documents and printing',
      programma: 'Program',
    },
    titoliGruppi: {
      'registroDocenti.aspetto': 'Language and theme',
      'registroDocenti.vassoio': 'Icon next to the clock',
      'registroDocenti.avvio': 'Startup',
      'registroDocenti.promemoria': 'Lesson reminders',
      'registroDocenti.proiezione': 'Projection for the class',
      'registroDocenti.posta': 'Mailbox',
      'registroDocenti.recapiti': 'Calls and emails from the personal details',
      'registroDocenti.modelli': 'Folder and downloads',
      'registroDocenti.ocr': 'Scan reading',
      'registroDocenti.assistente': 'Assistant',
      'registroDocenti.dettatura': 'Dictation',
      'registroDocenti.aggiornamenti': 'New versions',
      'registroDocenti.api': 'Pipe permissions',
    },
  },
})

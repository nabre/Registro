// I nomi delle aree e delle sezioni con chiavi delle impostazioni, i titoli dei
// gruppi e l'avvertenza del condotto: li leggono il pannello
// (`ui/pannello/views/settings/sections.ts`) e la finestra nativa, così li
// scrivono uguali. Le sezioni dell'anno e le parole di ricerca stanno nel
// pannello (`sections.testi.ts`).

import { catalogo } from '../i18n/index.js'
import type { Area, SezioneDiProgramma } from './areas.js'

/** Una sezione: il nome e il riassunto sotto il titolo. */
interface Sezione {
  titolo: string
  sottotitolo: string
}

const it = {
  aree: {
    calendario: 'Calendario',
    didattica: 'Didattica',
    utente: 'Utente',
    programma: 'Programma',
  } satisfies Record<Area, string>,
  sezioni: {
    posta: {
      titolo: 'Posta',
      sottotitolo:
        'la casella da cui partono le mail, quando si spediscono, la firma, e con che cosa si ' +
        'chiama o si scrive a una persona',
    },
    aspetto: {
      titolo: 'Aspetto',
      sottotitolo: 'la lingua e il tema',
    },
    avvio: {
      titolo: 'Avvio e promemoria',
      sottotitolo: 'l’avvio, l’icona accanto all’orologio, i promemoria, la proiezione',
    },
    modelli: {
      titolo: 'Assistente e modelli',
      sottotitolo: 'i modelli sulla tua macchina: assistente, scansioni, dettatura',
    },
    aggiornamenti: {
      titolo: 'Aggiornamenti',
      sottotitolo: 'la versione, e quando arriva quella nuova',
    },
    condotto: {
      titolo: 'Avanzate',
      sottotitolo:
        'l’integrazione con il sistema operativo, e se altri programmi possono parlare con il ' +
        'registro',
    },
  } satisfies Record<SezioneDiProgramma, Sezione>,
  /** Calendario e Didattica stanno dentro il file dell'anno: senza anno aperto non si regolano. */
  apriUnAnno: 'Stanno dentro il file dell’anno: apri un anno per regolarle.',
  avvertenzaCondotto:
    'Qui si concede a **programmi che non sono il registro** di guardarci dentro. Acceso il '
    + 'condotto, ogni programma che gira con il tuo stesso accesso può usarlo senza chiedertelo: '
    + 'non c’è una password e non c’è una domanda. Accendilo per il tempo che serve a quello '
    + 'script, e spegnilo quando hai finito.',
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
    'registroDocenti.avvio.integrazioneSistema': 'Sistema operativo',
    'registroDocenti.api': 'Concessioni del condotto',
  } as Readonly<Record<string, string>>,
}

export const testi = catalogo(it, {
  de: {
    aree: {
      calendario: 'Kalender',
      didattica: 'Unterricht',
      utente: 'Benutzer',
      programma: 'Programm',
    },
    sezioni: {
      posta: {
        titolo: 'Post',
        sottotitolo:
          'das Postfach, aus dem die Mails verschickt werden, wann sie verschickt werden, die ' +
          'Signatur, und womit man eine Person anruft oder ihr schreibt',
      },
      aspetto: {
        titolo: 'Aussehen',
        sottotitolo: 'die Sprache und das Design',
      },
      avvio: {
        titolo: 'Start und Erinnerungen',
        sottotitolo: 'der Start, das Symbol neben der Uhr, die Erinnerungen, die Projektion',
      },
      modelli: {
        titolo: 'Assistent und Modelle',
        sottotitolo: 'die Modelle auf deinem Computer: Assistent, Scans, Diktat',
      },
      aggiornamenti: {
        titolo: 'Aktualisierungen',
        sottotitolo: 'die Version, und wann die neue kommt',
      },
      condotto: {
        titolo: 'Erweitert',
        sottotitolo:
          'die Einbindung ins Betriebssystem, und ob andere Programme mit dem Klassenbuch ' +
          'sprechen dürfen',
      },
    },
    apriUnAnno: 'Sie stehen in der Datei des Schuljahrs: Öffne ein Schuljahr, um sie einzustellen.',
    avvertenzaCondotto:
      'Hier erlaubst du **Programmen, die nicht das Klassenbuch sind**, hineinzuschauen. Ist der '
      + 'Kanal eingeschaltet, kann jedes Programm, das mit deinem Zugang läuft, ihn benutzen, ohne '
      + 'dich zu fragen: Es gibt kein Passwort und keine Rückfrage. Schalte ihn so lange ein, wie '
      + 'das Skript ihn braucht, und schalte ihn aus, wenn du fertig bist.',
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
      'registroDocenti.avvio.integrazioneSistema': 'Betriebssystem',
      'registroDocenti.api': 'Freigaben des Kanals',
    },
  },
  fr: {
    aree: {
      calendario: 'Calendrier',
      didattica: 'Enseignement',
      utente: 'Utilisateur',
      programma: 'Programme',
    },
    sezioni: {
      posta: {
        titolo: 'Messagerie',
        sottotitolo:
          'la boîte d’où partent les e-mails, quand ils partent, la signature, et avec quoi on ' +
          'appelle une personne ou on lui écrit',
      },
      aspetto: {
        titolo: 'Apparence',
        sottotitolo: 'la langue et le thème',
      },
      avvio: {
        titolo: 'Démarrage et rappels',
        sottotitolo: 'le démarrage, l’icône près de l’horloge, les rappels, la projection',
      },
      modelli: {
        titolo: 'Assistant et modèles',
        sottotitolo: 'les modèles sur ta machine : assistant, scans, dictée',
      },
      aggiornamenti: {
        titolo: 'Mises à jour',
        sottotitolo: 'la version, et quand arrive la nouvelle',
      },
      condotto: {
        titolo: 'Avancé',
        sottotitolo:
          'l’intégration au système d’exploitation, et si d’autres programmes peuvent parler ' +
          'avec le registre',
      },
    },
    apriUnAnno: 'Ils sont dans le fichier de l’année : ouvre une année pour les régler.',
    avvertenzaCondotto:
      'Ici, tu permets à **des programmes qui ne sont pas le registre** de regarder dedans. Le '
      + 'canal allumé, tout programme qui tourne avec ton accès peut l’utiliser sans te le '
      + 'demander : il n’y a ni mot de passe ni question. Allume-le le temps dont ce script a '
      + 'besoin, et éteins-le quand tu as fini.',
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
      'registroDocenti.avvio.integrazioneSistema': 'Système d’exploitation',
      'registroDocenti.api': 'Autorisations du canal',
    },
  },
  en: {
    aree: {
      calendario: 'Calendar',
      didattica: 'Teaching',
      utente: 'User',
      programma: 'Program',
    },
    sezioni: {
      posta: {
        titolo: 'Mail',
        sottotitolo:
          'the mailbox emails are sent from, when they go out, the signature, and what you use ' +
          'to call or write to someone',
      },
      aspetto: {
        titolo: 'Appearance',
        sottotitolo: 'the language and the theme',
      },
      avvio: {
        titolo: 'Startup and reminders',
        sottotitolo: 'startup, the icon next to the clock, reminders, projection',
      },
      modelli: {
        titolo: 'Assistant and models',
        sottotitolo: 'the models on your computer: assistant, scans, dictation',
      },
      aggiornamenti: {
        titolo: 'Updates',
        sottotitolo: 'the version, and when the new one arrives',
      },
      condotto: {
        titolo: 'Advanced',
        sottotitolo:
          'integration with the operating system, and whether other programs may talk to the ' +
          'register',
      },
    },
    apriUnAnno: 'They live in the year’s file: open a year to set them.',
    avvertenzaCondotto:
      'Here you let **programs that are not the register** look inside. With the pipe on, any '
      + 'program running under your account can use it without asking you: there is no password '
      + 'and no question. Turn it on for as long as that script needs it, and turn it off when '
      + 'you are done.',
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
      'registroDocenti.avvio.integrazioneSistema': 'Operating system',
      'registroDocenti.api': 'Pipe permissions',
    },
  },
})

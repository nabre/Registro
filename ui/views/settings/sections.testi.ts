// I testi delle impostazioni per sezione che solo il pannello dice: nomi e
// riassunti delle sezioni dell'anno e dell'account, le parole che il filtro e
// Ctrl+K cercano, le pastiglie d'ambito. Aree, sezioni con chiavi, titoli dei
// gruppi e avvertenza del condotto stanno in `core/controlli/areas.testi.ts`,
// comuni con la finestra nativa; etichette e descrizioni delle singole
// impostazioni nel manifesto (`contract/manifest.testi.ts`).

import { catalogo } from '#core/i18n/index.js'
import type { SezioneDiProgramma } from '#core/controlli/areas.js'
import type { SezioneImpostazioni } from '#ui/place.js'

/**
 * Una sezione: il nome, il riassunto sotto il titolo, e le parole in più che
 * la trovano cercando (i campi del documento non sono nel manifesto).
 */
interface Sezione {
  titolo: string
  sottotitolo: string
  parole: string
}

const it = {
  sezioni: {
    anno: {
      titolo: 'Anno',
      sottotitolo: 'l’etichetta, le date, i semestri',
      parole: 'anno scolastico semestre inizio fine',
    },
    chiusure: {
      titolo: 'Chiusure',
      sottotitolo: 'vacanze e sospensioni; i calendari ufficiali da cui vengono',
      parole: 'vacanze ferie sospensioni festivi calendario ufficiale cantone PDF',
    },
    settimane: {
      titolo: 'Settimane',
      sottotitolo: 'le settimane A e B, e la lista dei loro tipi',
      parole: 'settimana A B alterna tipi di settimana',
    },
    giornata: {
      titolo: 'Giornata',
      sottotitolo:
        'l’unità didattica, le pause, l’inizio e la fine della giornata, i giorni mostrati',
      parole: 'UD unità didattica durata pause ricreazione pranzo orario giorni mostrati griglia',
    },
    ics: {
      titolo: 'Calendari esterni',
      sottotitolo:
        'l’orario della scuola da un link o da un file, e come riconoscere le lezioni',
      parole: 'ICS link file orario scuola regole riconoscere lezioni corso',
    },
    valutazione: {
      titolo: 'Valutazione',
      sottotitolo: 'la scala dei voti, l’arrotondamento di fine semestre, la soglia di assenza',
      parole: 'scala voti voto minimo massimo sufficienza passo arrotondamento assenze soglia',
    },
    liste: {
      titolo: 'Liste',
      sottotitolo: 'le voci dei menu a tendina: tipi di attività, di prova, supporti',
      parole: 'liste menu tendina tipi attività prova raggruppamento supporto correzione gruppi',
    },
    chiSei: {
      titolo: 'Chi sei',
      sottotitolo: 'appellativo, nome e cognome che firmano i fogli',
      parole: 'docente nome cognome appellativo firma intestazione',
    },
    stampa: {
      titolo: 'Carta e stampa',
      sottotitolo: 'le carte intestate e quando si rifanno i PDF',
      parole: 'carta intestata carte intestazione sede logo stampa PDF',
    },
    account: {
      titolo: 'Account',
      sottotitolo: 'gli account Microsoft collegati: la posta, e i documenti su OneDrive',
      parole: 'account Microsoft OneDrive posta casella collega scollega prova azzera',
    },
  } satisfies Record<Exclude<SezioneImpostazioni, SezioneDiProgramma>, Sezione>,
  /** Le parole in più che trovano le sezioni con chiavi; nomi e riassunti stanno in `areas.testi.ts`. */
  parole: {
    posta: 'posta mail e-mail casella mittente firma invio diretto recapiti telefono',
    aspetto: 'lingua tema chiaro scuro',
    avvio: 'avvio Windows icona orologio vassoio promemoria proiezione schermo',
    modelli: 'assistente modelli linguistici scansioni lettura dettatura cartella',
    aggiornamenti: 'aggiornamenti versione scarica installa',
    condotto: 'condotto riga di comando API script avanzate integrazione sistema operativo associazione PATH',
  } satisfies Record<SezioneDiProgramma, string>,
  /** La pastiglia d'ambito di ogni blocco, e il suo perché. */
  ambiti: {
    anno: 'Questo anno',
    computer: 'Questo computer',
  },
  ambitiAiuto: {
    anno: 'Si salva dentro il file dell’anno e viaggia con lui',
    computer: 'Resta su questo computer e vale per tutti gli anni',
  },
  // Il punto sulla scheda dell'area: che cosa chiede attenzione.
  accesoSenzaModello: (nome: string) => `«${nome}» è acceso, ma senza un modello`,
  invioSenzaCasella: 'L’invio diretto è acceso, ma la casella di posta non è collegata',
}

export const testi = catalogo(it, {
  de: {
    sezioni: {
      anno: {
        titolo: 'Jahr',
        sottotitolo: 'die Bezeichnung, die Daten, die Semester',
        parole: 'Schuljahr Semester Beginn Ende',
      },
      chiusure: {
        titolo: 'Schliessungen',
        sottotitolo:
          'Ferien und unterrichtsfreie Tage; die offiziellen Kalender, aus denen sie stammen',
        parole: 'Ferien Feiertage Schliessungen offizieller Kalender Kanton PDF',
      },
      settimane: {
        titolo: 'Wochen',
        sottotitolo: 'die A- und B-Wochen, und die Liste ihrer Typen',
        parole: 'Woche A B abwechseln Wochentypen',
      },
      giornata: {
        titolo: 'Schultag',
        sottotitolo: 'die Lektion, die Pausen, Beginn und Ende des Tages, die angezeigten Tage',
        parole: 'Lektion Dauer Pausen Mittag Stundenplan angezeigte Tage Raster',
      },
      ics: {
        titolo: 'Externe Kalender',
        sottotitolo:
          'der Stundenplan der Schule aus einem Link oder einer Datei, und wie man die ' +
          'Stunden erkennt',
        parole: 'ICS Link Datei Stundenplan Schule Regeln erkennen Stunden Kurs',
      },
      valutazione: {
        titolo: 'Beurteilung',
        sottotitolo: 'die Notenskala, die Rundung am Semesterende, die Absenzengrenze',
        parole: 'Notenskala Note Minimum Maximum genügend Schritt Rundung Absenzen Grenze',
      },
      liste: {
        titolo: 'Listen',
        sottotitolo:
          'die Einträge der Auswahlmenüs: Arten von Aktivitäten, Prüfungen, Hilfsmittel',
        parole: 'Listen Auswahlmenü Aktivitäten Prüfung Gruppierung Hilfsmittel Korrektur Gruppen',
      },
      chiSei: {
        titolo: 'Wer du bist',
        sottotitolo: 'Anrede, Vorname und Nachname, die die Blätter unterschreiben',
        parole: 'Lehrperson Vorname Nachname Anrede Unterschrift Briefkopf',
      },
      stampa: {
        titolo: 'Briefpapier und Druck',
        sottotitolo: 'das Briefpapier, und wann die PDFs neu entstehen',
        parole: 'Briefpapier Briefkopf Schule Logo Druck PDF',
      },
      account: {
        titolo: 'Konten',
        sottotitolo:
          'die verbundenen Microsoft-Konten: die Post, und die Dokumente auf OneDrive',
        parole: 'Konto Microsoft OneDrive Post Postfach verbinden trennen testen zurücksetzen',
      },
    },
    parole: {
      posta: 'Post Mail E-Mail Postfach Absender Signatur Direktversand Kontakt Telefon',
      aspetto: 'Sprache Design hell dunkel',
      avvio: 'Start Windows Symbol Uhr Infobereich Erinnerungen Projektion Bildschirm',
      modelli: 'Assistent Sprachmodelle Scans Lesen Diktat Ordner',
      aggiornamenti: 'Aktualisierungen Version herunterladen installieren',
      condotto: 'Kanal Befehlszeile API Skript erweitert Einbindung Betriebssystem Verknüpfung PATH',
    },
    ambiti: {
      anno: 'Dieses Jahr',
      computer: 'Dieser Computer',
    },
    ambitiAiuto: {
      anno: 'Wird in der Datei des Jahres gespeichert und reist mit ihr',
      computer: 'Bleibt auf diesem Computer und gilt für alle Jahre',
    },
    accesoSenzaModello: (nome) => `«${nome}» ist eingeschaltet, aber ohne Modell`,
    invioSenzaCasella: 'Der Direktversand ist eingeschaltet, aber das Postfach ist nicht verbunden',
  },
  fr: {
    sezioni: {
      anno: {
        titolo: 'Année',
        sottotitolo: 'le libellé, les dates, les semestres',
        parole: 'année scolaire semestre début fin',
      },
      chiusure: {
        titolo: 'Fermetures',
        sottotitolo: 'vacances et suspensions ; les calendriers officiels d’où elles viennent',
        parole: 'vacances congés fermetures jours fériés calendrier officiel canton PDF',
      },
      settimane: {
        titolo: 'Semaines',
        sottotitolo: 'les semaines A et B, et la liste de leurs types',
        parole: 'semaine A B alterner types de semaine',
      },
      giornata: {
        titolo: 'Journée',
        sottotitolo:
          'la période, les pauses, le début et la fin de la journée, les jours affichés',
        parole: 'période durée pauses récréation midi horaire jours affichés grille',
      },
      ics: {
        titolo: 'Calendriers externes',
        sottotitolo:
          'l’horaire de l’école depuis un lien ou un fichier, et comment reconnaître les leçons',
        parole: 'ICS lien fichier horaire école règles reconnaître leçons cours',
      },
      valutazione: {
        titolo: 'Évaluation',
        sottotitolo: 'le barème, l’arrondi de fin de semestre, le seuil d’absence',
        parole: 'barème note minimum maximum suffisance pas arrondi absences seuil',
      },
      liste: {
        titolo: 'Listes',
        sottotitolo:
          'les entrées des menus déroulants : types d’activité, d’épreuve, supports',
        parole:
          'listes menu déroulant types activité épreuve regroupement support correction groupes',
      },
      chiSei: {
        titolo: 'Qui tu es',
        sottotitolo: 'titre, prénom et nom qui signent les feuilles',
        parole: 'enseignant prénom nom titre signature en-tête',
      },
      stampa: {
        titolo: 'Papier et impression',
        sottotitolo: 'le papier à en-tête, et quand les PDF sont refaits',
        parole: 'papier à en-tête école logo impression PDF',
      },
      account: {
        titolo: 'Comptes',
        sottotitolo:
          'les comptes Microsoft connectés : la messagerie, et les documents sur OneDrive',
        parole: 'compte Microsoft OneDrive messagerie boîte connecter déconnecter tester réinitialiser',
      },
    },
    parole: {
      posta: 'messagerie courrier e-mail boîte expéditeur signature envoi direct coordonnées téléphone',
      aspetto: 'langue thème clair sombre',
      avvio: 'démarrage Windows icône horloge zone de notification rappels projection écran',
      modelli: 'assistant modèles de langage scans lecture dictée dossier',
      aggiornamenti: 'mises à jour version télécharger installer',
      condotto: 'canal ligne de commande API script avancé intégration système d’exploitation association PATH',
    },
    ambiti: {
      anno: 'Cette année',
      computer: 'Cet ordinateur',
    },
    ambitiAiuto: {
      anno: 'S’enregistre dans le fichier de l’année et voyage avec lui',
      computer: 'Reste sur cet ordinateur et vaut pour toutes les années',
    },
    accesoSenzaModello: (nome) => `« ${nome} » est allumé, mais sans modèle`,
    invioSenzaCasella: 'L’envoi direct est allumé, mais la boîte aux lettres n’est pas connectée',
  },
  en: {
    sezioni: {
      anno: {
        titolo: 'Year',
        sottotitolo: 'the label, the dates, the semesters',
        parole: 'school year semester start end',
      },
      chiusure: {
        titolo: 'Closures',
        sottotitolo: 'holidays and suspensions; the official calendars they come from',
        parole: 'holidays closures bank holidays official calendar canton PDF',
      },
      settimane: {
        titolo: 'Weeks',
        sottotitolo: 'the A and B weeks, and the list of their types',
        parole: 'week A B alternate week types',
      },
      giornata: {
        titolo: 'School day',
        sottotitolo: 'the period, the breaks, the start and end of the day, the days shown',
        parole: 'period length breaks lunch timetable days shown grid',
      },
      ics: {
        titolo: 'External calendars',
        sottotitolo: 'the school timetable from a link or a file, and how to recognise lessons',
        parole: 'ICS link file timetable school rules recognise lessons course',
      },
      valutazione: {
        titolo: 'Assessment',
        sottotitolo: 'the grading scale, end-of-semester rounding, the absence threshold',
        parole: 'grading scale grade minimum maximum pass mark step rounding absences threshold',
      },
      liste: {
        titolo: 'Lists',
        sottotitolo: 'the entries of the drop-down menus: types of activity, of test, materials',
        parole: 'lists drop-down menu types activity test grouping materials marking groups',
      },
      chiSei: {
        titolo: 'Who you are',
        sottotitolo: 'title, first name and surname that sign the sheets',
        parole: 'teacher first name surname title signature letterhead',
      },
      stampa: {
        titolo: 'Letterheads and printing',
        sottotitolo: 'the letterheads, and when the PDFs are remade',
        parole: 'letterhead school logo printing PDF',
      },
      account: {
        titolo: 'Accounts',
        sottotitolo: 'the connected Microsoft accounts: mail, and the documents on OneDrive',
        parole: 'account Microsoft OneDrive mail mailbox connect disconnect test reset',
      },
    },
    parole: {
      posta: 'mail email mailbox sender signature direct sending contact phone',
      aspetto: 'language theme light dark',
      avvio: 'startup Windows icon clock tray reminders projection screen',
      modelli: 'assistant language models scans reading dictation folder',
      aggiornamenti: 'updates version download install',
      condotto: 'pipe command line API script advanced integration operating system association PATH',
    },
    ambiti: {
      anno: 'This year',
      computer: 'This computer',
    },
    ambitiAiuto: {
      anno: 'Saved inside the year’s file, and travels with it',
      computer: 'Stays on this computer and applies to every year',
    },
    accesoSenzaModello: (nome) => `“${nome}” is on, but without a model`,
    invioSenzaCasella: 'Direct sending is on, but the mailbox is not connected',
  },
})

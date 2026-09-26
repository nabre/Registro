// I testi delle procedure di `registro`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo, numero } from '../../../i18n/index.js'

const it = {
  altrove: {
    titolo: 'Che cosa c’è in un altro registro, blocco per blocco, prima di importarlo',
    percorso: 'Il file .regi da leggere, percorso completo. Non quello aperto',
    anno: 'Come si chiama quell’anno: «2025/2026»',
    scala: 'La scala dei voti in breve: «1–6, sufficienza 4»',
    carte: 'Quante carte intestate',
    loghi: 'Quante di quelle hanno un logo',
    docente: 'Chi firma i fogli; vuoto se nessuno',
    liste: 'Quante liste delle tendine non sono quelle di fabbrica',
    nuova: 'Vero se nell’anno aperto non ce n’è una con lo stesso nome',
    classeId: 'La classe, da passare a registro.importa',
    persone: 'Quante persone porterebbe con sé, ritirate comprese',
    corsi: 'Quanti corsi ha',
    materie: 'Che cosa ci si insegnava',
    piani: 'Quanti piani stanno sui suoi corsi',
    esiste: 'Vero se nell’anno aperto c’è già una classe con quel nome: si salterebbe',
    calendari: 'I nomi dei calendari ICS',
    regole: 'Quante regole dicono quale evento è quale corso',
    /** La scala in breve, com'è scritta nell'uscita. */
    scalaInBreve: (min: number, max: number, sufficienza: number) =>
      `${min}–${max}, sufficienza ${sufficienza}`,
    presentazione: {
      titolo: 'Un altro registro',
      anno: 'Anno scolastico',
      regole: 'Regole del calendario',
      classe: 'Classe',
      persone: 'Persone',
      corsi: 'Corsi',
      piani: 'Piani',
      materie: 'Materie',
    },
  },
  importa: {
    titolo:
      'Porta nell’anno aperto, a blocchi, impostazioni, materie, classi, piani e calendari di ' +
      'un altro registro',
    percorso: 'Il file .regi da cui si porta, percorso completo. Non quello aperto',
    impostazioni:
      'Vero per portare scala dei voti, arrotondamenti, soglia d’assenza, giornata del ' +
      'calendario, liste e carta intestata. Mai le date dell’anno',
    materie:
      'Vero per portare tutte le materie: quelle con lo stesso nome si usano, le altre nascono',
    classeId: 'La classe di quel documento: la dà registro.altrove',
    anagrafica: 'Vero per portare le persone e le loro foto',
    corsi: 'Vero per portare i corsi con il loro orario',
    classi: 'Le classi da portare. Una che qui c’è già con lo stesso nome si salta',
    piani: 'Vero per portare i piani dei corsi portati, con i loro allegati: mai lezioni',
    calendari: 'Vero per aggiungere i calendari ICS e le regole dei corsi portati',
  },
  integrita: {
    titolo: 'I riferimenti rotti del registro, e le correzioni che si saprebbero fare',
    riferimentiRotti: 'Quel che non torna, una frase per rottura',
    titoloRiparazione: 'Che cosa succede, detto prima di farlo',
    dettaglio: 'Le raccolte che la correzione toccherebbe',
    presentazione: {
      titolo: 'Che cosa non torna nel registro',
      riferimentiRotti: 'Riferimenti rotti',
      correzioni: 'Correzioni possibili',
      correzione: 'Correzione',
      cheCosaTocca: 'Che cosa tocca',
    },
  },
  riassunto: {
    titolo: 'Che cosa c’è nel registro aperto, in cifre',
    versione: 'La versione dello schema dei dati',
    daSmistare: 'Smistamenti con pagine ancora in quarantena',
    presentazione: {
      titolo: 'Il registro in cifre',
      classi: 'Classi',
      corsi: 'Corsi',
      lezioni: 'Ore a calendario',
      valutazioni: 'Momenti di valutazione',
      consegne: 'Consegne',
      daSmistare: 'Da smistare',
    },
  },
  sfoglia: {
    titolo:
      'Sceglie con il dialogo del sistema un altro documento .regi, e ne torna il percorso',
    percorso: 'Il file scelto, percorso completo; null se non si è scelto',
    dialogo: 'Importa da un altro registro',
    presentazione: {
      titolo: 'Il registro scelto',
      file: 'File',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    altrove: {
      titolo: 'Was in einem anderen Klassenbuch steht, Block für Block, bevor man es importiert',
      percorso: 'Die zu lesende .regi-Datei, vollständiger Pfad. Nicht die geöffnete',
      anno: 'Wie dieses Jahr heisst: «2025/2026»',
      scala: 'Die Notenskala in Kurzform: «1–6, genügend ab 4»',
      carte: 'Wie viele Briefpapiere',
      loghi: 'Wie viele davon ein Logo haben',
      docente: 'Wer die Blätter unterschreibt; leer, wenn niemand',
      liste: 'Wie viele Auswahllisten nicht die ab Werk sind',
      nuova: 'Wahr, wenn es im geöffneten Jahr keines mit demselben Namen gibt',
      classeId: 'Die Klasse, an registro.importa zu übergeben',
      persone: 'Wie viele Personen sie mitbrächte, ausgetretene eingeschlossen',
      corsi: 'Wie viele Kurse sie hat',
      materie: 'Was dort unterrichtet wurde',
      piani: 'Wie viele Pläne an ihren Kursen hängen',
      esiste:
        'Wahr, wenn es im geöffneten Jahr schon eine Klasse mit diesem Namen gibt: Sie würde ' +
        'übersprungen',
      calendari: 'Die Namen der ICS-Kalender',
      regole: 'Wie viele Regeln sagen, welcher Termin zu welchem Kurs gehört',
      scalaInBreve: (min, max, sufficienza) =>
        `${numero(min)}–${numero(max)}, genügend ab ${numero(sufficienza)}`,
      presentazione: {
        titolo: 'Ein anderes Klassenbuch',
        anno: 'Schuljahr',
        regole: 'Kalenderregeln',
        classe: 'Klasse',
        persone: 'Personen',
        corsi: 'Kurse',
        piani: 'Pläne',
        materie: 'Fächer',
      },
    },
    importa: {
      titolo:
        'Übernimmt ins geöffnete Jahr, blockweise, Einstellungen, Fächer, Klassen, Pläne und ' +
        'Kalender eines anderen Klassenbuchs',
      percorso:
        'Die .regi-Datei, aus der übernommen wird, vollständiger Pfad. Nicht die geöffnete',
      impostazioni:
        'Wahr, um Notenskala, Rundungen, Absenzenschwelle, Tagesablauf des Kalenders, Listen und ' +
        'Briefpapier zu übernehmen. Nie die Daten des Jahres',
      materie:
        'Wahr, um alle Fächer zu übernehmen: Die mit gleichem Namen werden verwendet, die ' +
        'anderen neu angelegt',
      classeId: 'Die Klasse jenes Dokuments: Sie liefert registro.altrove',
      anagrafica: 'Wahr, um die Personen und ihre Fotos zu übernehmen',
      corsi: 'Wahr, um die Kurse mit ihrem Stundenplan zu übernehmen',
      classi:
        'Die zu übernehmenden Klassen. Eine, die es hier schon mit demselben Namen gibt, wird ' +
        'übersprungen',
      piani:
        'Wahr, um die Pläne der übernommenen Kurse mit ihren Anhängen zu übernehmen: nie ' +
        'Stunden',
      calendari:
        'Wahr, um die ICS-Kalender und die Regeln der übernommenen Kurse hinzuzufügen',
    },
    integrita: {
      titolo:
        'Die gebrochenen Verweise des Klassenbuchs und die Korrekturen, die sich machen liessen',
      riferimentiRotti: 'Was nicht stimmt, ein Satz pro Bruch',
      titoloRiparazione: 'Was geschieht, gesagt, bevor es getan wird',
      dettaglio: 'Die Sammlungen, die die Korrektur berühren würde',
      presentazione: {
        titolo: 'Was im Klassenbuch nicht stimmt',
        riferimentiRotti: 'Gebrochene Verweise',
        correzioni: 'Mögliche Korrekturen',
        correzione: 'Korrektur',
        cheCosaTocca: 'Was sie berührt',
      },
    },
    riassunto: {
      titolo: 'Was im geöffneten Klassenbuch steht, in Zahlen',
      versione: 'Die Version des Datenschemas',
      daSmistare: 'Zuordnungen mit Seiten, die noch in der Quarantäne sind',
      presentazione: {
        titolo: 'Das Klassenbuch in Zahlen',
        classi: 'Klassen',
        corsi: 'Kurse',
        lezioni: 'Stunden im Kalender',
        valutazioni: 'Leistungsbeurteilungen',
        consegne: 'Aufträge',
        daSmistare: 'Zuzuordnen',
      },
    },
    sfoglia: {
      titolo:
        'Wählt mit dem Dialog des Systems ein anderes .regi-Dokument und gibt seinen Pfad ' +
        'zurück',
      percorso: 'Die gewählte Datei, vollständiger Pfad; null, wenn nichts gewählt wurde',
      dialogo: 'Aus einem anderen Klassenbuch importieren',
      presentazione: {
        titolo: 'Das gewählte Klassenbuch',
        file: 'Datei',
      },
    },
  },
  fr: {
    altrove: {
      titolo:
        'Ce qu’il y a dans un autre registre, bloc par bloc, avant de l’importer',
      percorso: 'Le fichier .regi à lire, chemin complet. Pas celui qui est ouvert',
      anno: 'Le nom de cette année : « 2025/2026 »',
      scala: 'Le barème des notes en bref : « 1–6, seuil de suffisance 4 »',
      carte: 'Combien de papiers à en-tête',
      loghi: 'Combien d’entre eux ont un logo',
      docente: 'Qui signe les feuilles ; vide si personne',
      liste: 'Combien de listes déroulantes ne sont pas celles d’origine',
      nuova: 'Vrai si l’année ouverte n’en a pas une avec le même nom',
      classeId: 'La classe, à passer à registro.importa',
      persone: 'Combien de personnes elle emporterait, y compris celles qui ont abandonné',
      corsi: 'Combien de cours elle a',
      materie: 'Ce qu’on y enseignait',
      piani: 'Combien de plans se trouvent sur ses cours',
      esiste:
        'Vrai si l’année ouverte a déjà une classe de ce nom : elle serait sautée',
      calendari: 'Les noms des calendriers ICS',
      regole: 'Combien de règles disent quel événement correspond à quel cours',
      scalaInBreve: (min, max, sufficienza) =>
        `${numero(min)}–${numero(max)}, seuil de suffisance ${numero(sufficienza)}`,
      presentazione: {
        titolo: 'Un autre registre',
        anno: 'Année scolaire',
        regole: 'Règles du calendrier',
        classe: 'Classe',
        persone: 'Personnes',
        corsi: 'Cours',
        piani: 'Plans',
        materie: 'Branches',
      },
    },
    importa: {
      titolo:
        'Apporte dans l’année ouverte, par blocs, paramètres, branches, classes, plans et ' +
        'calendriers d’un autre registre',
      percorso:
        'Le fichier .regi d’où l’on apporte, chemin complet. Pas celui qui est ouvert',
      impostazioni:
        'Vrai pour apporter le barème, les arrondis, le seuil d’absence, la journée du ' +
        'calendrier, les listes et le papier à en-tête. Jamais les dates de l’année',
      materie:
        'Vrai pour apporter toutes les branches : celles qui ont le même nom sont reprises, les ' +
        'autres sont créées',
      classeId: 'La classe de ce document : registro.altrove la fournit',
      anagrafica: 'Vrai pour apporter les personnes et leurs photos',
      corsi: 'Vrai pour apporter les cours avec leur horaire',
      classi:
        'Les classes à apporter. Une classe qui existe déjà ici avec le même nom est sautée',
      piani:
        'Vrai pour apporter les plans des cours apportés, avec leurs pièces jointes : jamais ' +
        'de leçons',
      calendari: 'Vrai pour ajouter les calendriers ICS et les règles des cours apportés',
    },
    integrita: {
      titolo: 'Les références cassées du registre, et les corrections qu’on saurait faire',
      riferimentiRotti: 'Ce qui ne va pas, une phrase par rupture',
      titoloRiparazione: 'Ce qui se passe, dit avant de le faire',
      dettaglio: 'Les collections que la correction toucherait',
      presentazione: {
        titolo: 'Ce qui ne va pas dans le registre',
        riferimentiRotti: 'Références cassées',
        correzioni: 'Corrections possibles',
        correzione: 'Correction',
        cheCosaTocca: 'Ce qu’elle touche',
      },
    },
    riassunto: {
      titolo: 'Ce qu’il y a dans le registre ouvert, en chiffres',
      versione: 'La version du schéma des données',
      daSmistare: 'Tris avec des pages encore en quarantaine',
      presentazione: {
        titolo: 'Le registre en chiffres',
        classi: 'Classes',
        corsi: 'Cours',
        lezioni: 'Leçons au calendrier',
        valutazioni: 'Évaluations',
        consegne: 'Devoirs',
        daSmistare: 'À trier',
      },
    },
    sfoglia: {
      titolo:
        'Choisit avec la boîte de dialogue du système un autre document .regi, et en ' +
        'renvoie le chemin',
      percorso: 'Le fichier choisi, chemin complet ; null si rien n’a été choisi',
      dialogo: 'Importer depuis un autre registre',
      presentazione: {
        titolo: 'Le registre choisi',
        file: 'Fichier',
      },
    },
  },
  en: {
    altrove: {
      titolo: 'What is in another register, block by block, before importing it',
      percorso: 'The .regi file to read, full path. Not the open one',
      anno: 'What that year is called: “2025/2026”',
      scala: 'The grading scale in short: “1–6, pass mark 4”',
      carte: 'How many letterheads',
      loghi: 'How many of them have a logo',
      docente: 'Who signs the sheets; empty if nobody',
      liste: 'How many drop-down lists are not the factory ones',
      nuova: 'True if the open year has none with the same name',
      classeId: 'The class, to pass to registro.importa',
      persone: 'How many people it would bring along, withdrawn ones included',
      corsi: 'How many courses it has',
      materie: 'What was taught there',
      piani: 'How many plans are on its courses',
      esiste: 'True if the open year already has a class with that name: it would be skipped',
      calendari: 'The names of the ICS calendars',
      regole: 'How many rules say which event is which course',
      scalaInBreve: (min, max, sufficienza) =>
        `${numero(min)}–${numero(max)}, pass mark ${numero(sufficienza)}`,
      presentazione: {
        titolo: 'Another register',
        anno: 'School year',
        regole: 'Calendar rules',
        classe: 'Class',
        persone: 'People',
        corsi: 'Courses',
        piani: 'Plans',
        materie: 'Subjects',
      },
    },
    importa: {
      titolo:
        'Brings into the open year, block by block, the settings, subjects, classes, plans and ' +
        'calendars of another register',
      percorso: 'The .regi file to bring from, full path. Not the open one',
      impostazioni:
        'True to bring over the grading scale, rounding, absence threshold, the calendar’s ' +
        'school day, lists and letterhead. Never the year’s dates',
      materie:
        'True to bring over all subjects: those with the same name are reused, the others are ' +
        'created',
      classeId: 'The class in that document: registro.altrove gives it',
      anagrafica: 'True to bring over the people and their photos',
      corsi: 'True to bring over the courses with their timetable',
      classi:
        'The classes to bring over. One that already exists here with the same name is skipped',
      piani:
        'True to bring over the plans of the courses brought over, with their attachments: ' +
        'never lessons',
      calendari: 'True to add the ICS calendars and the rules of the courses brought over',
    },
    integrita: {
      titolo: 'The register’s broken references, and the fixes that could be made',
      riferimentiRotti: 'What does not add up, one sentence per break',
      titoloRiparazione: 'What happens, said before doing it',
      dettaglio: 'The collections the fix would touch',
      presentazione: {
        titolo: 'What does not add up in the register',
        riferimentiRotti: 'Broken references',
        correzioni: 'Possible fixes',
        correzione: 'Fix',
        cheCosaTocca: 'What it touches',
      },
    },
    riassunto: {
      titolo: 'What is in the open register, in figures',
      versione: 'The version of the data schema',
      daSmistare: 'Sortings with pages still in quarantine',
      presentazione: {
        titolo: 'The register in figures',
        classi: 'Classes',
        corsi: 'Courses',
        lezioni: 'Lessons in the calendar',
        valutazioni: 'Assessments',
        consegne: 'Assignments',
        daSmistare: 'To sort',
      },
    },
    sfoglia: {
      titolo: 'Picks another .regi document with the system dialog, and returns its path',
      percorso: 'The chosen file, full path; null if nothing was chosen',
      dialogo: 'Import from another register',
      presentazione: {
        titolo: 'The chosen register',
        file: 'File',
      },
    },
  },
})

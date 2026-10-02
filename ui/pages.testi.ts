// I testi delle destinazioni (`pages.ts`): nomi delle pagine e dei gruppi, e
// che cosa c'è in ognuna. La guida cita questi nomi: cambiandone uno va
// cambiato anche là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'
import { CARTE, LEZIONE, Molti, PERSONE, PIF, SCUOLA, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'

const it = {
  nessunaLezione: 'Questo corso non ha ancora nessuna lezione.',

  dashboard: 'Dashboard',
  oggiAiuto:
    'La giornata in una schermata: le lezioni di oggi, quel che resta aperto, e dove andare',
  calendario: 'Calendario',
  calendarioAiuto:
    'Le lezioni di tutte le classi insieme, settimana per settimana',
  pendenze: Molti(CARTE.pendenza),
  pendenzeAiuto: 'Quel che è stato dato e non è ancora tornato indietro',
  classi: Molti(SCUOLA.classe),
  classiAiuto: 'L’elenco delle classi e dei loro gruppi',
  persone: Molti(PIF),
  personeAiuto:
    'Tutte le persone dell’anno in un elenco solo, con la loro scheda accanto',
  mappa: 'Mappa',
  mappaAiuto: 'Dove abitano, dove lavorano, e quanto distano dalla sede',
  corsi: Molti(SCUOLA.corso),
  corsiAiuto:
    'Quale materia a quale classe, in una matrice: e sotto, il corso scelto',
  daSmistare: 'Da smistare',
  daSmistareAiuto:
    'I PDF caricati che aspettano di essere divisi, di tutte le tue classi',
  lezione: Uno(LEZIONE.lezione),
  lezioneAiuto: 'Presenze, argomenti e consegne della lezione',
  valutazioni: 'Valutazioni',
  valutazioniAiuto: 'I momenti di valutazione del corso e i loro voti',
  check: 'Check',
  checkAiuto:
    'Le cose da fare una volta, spuntate persona per persona con il loro giorno',
  checkClasse: 'Check della classe',
  checkClasseAiuto: 'Le cose della classe da verificare come docente di classe',
  piani: Molti(LEZIONE.pianoLezione),
  pianiAiuto: 'Come è fatta una lezione prima di svolgerla',
  progetti: Molti(CARTE.progetto),
  progettiAiuto: 'I progetti del corso: compiti, criteri, matrice a livelli e giudizi',
  overview: 'Panoramica',
  overviewAiuto: 'Visione d’insieme di lezioni, piani, progetti e risorse collegate',
  documenti: 'Documenti',
  documentiAiuto: 'Quel che esce dal registro e va in mano ad altri',
  pendenzeClasse: `${Molti(CARTE.pendenza)} della classe`,
  archivio: 'Archivio documentale',
  archivioAiuto: 'Chi ha consegnato e chi no, foglio per foglio',
  assenze: 'Assenze',
  assenzeAiuto: 'Le assenze della classe, da giustificare e da contare',
  messaggistica: 'Messaggistica',
  messaggisticaAiuto: 'Recapiti e comunicazioni alle famiglie',
  impostazioni: 'Impostazioni',
  impostazioniAiuto:
    'Giornata e chiusure, scala dei voti, carta intestata, posta, modelli linguistici',
  guida: 'Guida',
  guidaAiuto: 'Come si usa il registro, in una pagina',

  /** I nomi corti dei gruppi, quelli scritti sulla barra laterale. */
  gruppi: {
    agenda: 'Agenda',
    registro: 'Registro',
    progettazione: 'Progettazione',
    classe: Uno(PERSONE.docenteClasse),
    anno: 'L’anno',
    sistema: 'Il programma',
  },
  /** Il titolo lungo di un gruppo, con dentro il corso o la classe. */
  registroDi: (corso: string) => `Registro — ${corso}`,
  progettazioneDi: (corso: string) => `Progettazione — ${corso}`,
  docenteDi: (classe: string) => `${Uno(PERSONE.docenteClasse)} — ${classe}`,
  schedaPersona: 'Scheda della persona',
}

export const testi = catalogo(it, {
  de: {
    nessunaLezione: 'Dieser Kurs hat noch keine Stunde.',
    dashboard: 'Dashboard',
    oggiAiuto:
      'Der Tag auf einen Blick: die Stunden von heute, was noch offen ist, und wohin es weitergeht',
    calendario: 'Kalender',
    calendarioAiuto: 'Die Stunden aller Klassen zusammen, Woche für Woche',
    pendenze: Molti(lessico.in('de').pendenza),
    pendenzeAiuto: 'Was ausgegeben wurde und noch nicht zurückgekommen ist',
    classi: Molti(lessico.in('de').classe),
    classiAiuto: 'Die Liste der Klassen und ihrer Gruppen',
    persone: Molti(lessico.in('de').pif),
    personeAiuto:
      'Alle Personen des Schuljahrs in einer einzigen Liste, mit ihrem Personenblatt daneben',
    mappa: 'Karte',
    mappaAiuto:
      'Wo sie wohnen, wo sie arbeiten, und wie weit sie vom Schulhaus entfernt sind',
    corsi: Molti(lessico.in('de').corso),
    corsiAiuto:
      'Welches Fach welcher Klasse, in einer Matrix: und darunter der gewählte Kurs',
    daSmistare: 'Zuzuordnen',
    daSmistareAiuto:
      'Die geladenen PDFs, die darauf warten, aufgeteilt zu werden, aus all deinen Klassen',
    lezione: Uno(lessico.in('de').lezione),
    lezioneAiuto: 'Präsenzen, Themen und Aufträge der Stunde',
    valutazioni: 'Beurteilungen',
    valutazioniAiuto: 'Die Leistungsbeurteilungen des Kurses und ihre Noten',
    check: 'Check',
    checkAiuto:
      'Was einmal zu tun ist, Person für Person abgehakt, mit dem Tag',
    checkClasse: 'Check der Klasse',
    checkClasseAiuto:
      'Was du als Klassenlehrperson für die Klasse prüfen musst',
    piani: Molti(lessico.in('de').pianoLezione),
    pianiAiuto: 'Wie eine Stunde aufgebaut ist, bevor man sie hält',
    progetti: Molti(lessico.in('de').progetto),
    progettiAiuto: 'Die Projekte des Kurses: Aufgaben, Kriterien, Stufenraster und Einschätzungen',
    overview: 'Übersicht',
    overviewAiuto: 'Gesamtübersicht über Stunden, Pläne, Projekte und verknüpfte Ressourcen',
    documenti: 'Dokumente',
    documentiAiuto:
      'Was aus dem Klassenbuch hinausgeht und in andere Hände kommt',
    pendenzeClasse: `${Molti(lessico.in('de').pendenza)} der Klasse`,
    archivio: 'Dokumentenarchiv',
    archivioAiuto: 'Wer abgegeben hat und wer nicht, Blatt für Blatt',
    assenze: 'Absenzen',
    assenzeAiuto: 'Die Absenzen der Klasse, zu entschuldigen und zu zählen',
    messaggistica: 'Mitteilungen',
    messaggisticaAiuto: 'Kontaktadressen und Mitteilungen an die Familien',
    impostazioni: 'Einstellungen',
    impostazioniAiuto:
      'Schultag und Schliessungen, Notenskala, Briefpapier, E-Mail, Sprachmodelle',
    guida: 'Hilfe',
    guidaAiuto: 'Wie man das Klassenbuch benutzt, auf einer Seite',
    gruppi: {
      agenda: 'Agenda',
      registro: 'Klassenbuch',
      progettazione: 'Planung',
      classe: 'Klassenlehrperson',
      anno: 'Schuljahr',
      sistema: 'Programm',
    },
    registroDi: (corso) => `Klassenbuch — ${corso}`,
    progettazioneDi: (corso) => `Planung — ${corso}`,
    docenteDi: (classe) => `Klassenlehrperson — ${classe}`,
    schedaPersona: 'Personenblatt',
  },
  fr: {
    nessunaLezione: 'Ce cours n’a encore aucune leçon.',
    dashboard: 'Tableau de bord',
    oggiAiuto:
      'La journée en un coup d’œil : les leçons d’aujourd’hui, ce qui reste ouvert, et où aller',
    calendario: 'Calendrier',
    calendarioAiuto:
      'Les leçons de toutes les classes ensemble, semaine après semaine',
    pendenze: Molti(lessico.in('fr').pendenza),
    pendenzeAiuto: 'Ce qui a été donné et n’est pas encore revenu',
    classi: Molti(lessico.in('fr').classe),
    classiAiuto: 'La liste des classes et de leurs groupes',
    persone: Molti(lessico.in('fr').pif),
    personeAiuto:
      'Toutes les personnes de l’année dans une seule liste, avec leur fiche à côté',
    mappa: 'Carte',
    mappaAiuto:
      'Où ils habitent, où ils travaillent, et à quelle distance de l’école',
    corsi: Molti(lessico.in('fr').corso),
    corsiAiuto:
      'Quelle branche pour quelle classe, dans une matrice : et dessous, le cours choisi',
    daSmistare: 'À trier',
    daSmistareAiuto:
      'Les PDF chargés qui attendent d’être divisés, de toutes tes classes',
    lezione: Uno(lessico.in('fr').lezione),
    lezioneAiuto: 'Présences, sujets et devoirs de la leçon',
    valutazioni: 'Évaluations',
    valutazioniAiuto: 'Les évaluations du cours et leurs notes',
    check: 'Check',
    checkAiuto:
      'Les choses à faire une fois, cochées personne par personne avec leur date',
    checkClasse: 'Check de la classe',
    checkClasseAiuto:
      'Ce qu’il faut vérifier pour la classe comme maître de classe',
    piani: Molti(lessico.in('fr').pianoLezione),
    pianiAiuto: 'Comment une leçon est construite avant de la donner',
    progetti: Molti(lessico.in('fr').progetto),
    progettiAiuto: 'Les projets du cours : tâches, critères, grille à niveaux et appréciations',
    overview: 'Vue d’ensemble',
    overviewAiuto: 'Vue globale des leçons, plans, projets et ressources associées',
    documenti: 'Documents',
    documentiAiuto: 'Ce qui sort du registre et passe entre d’autres mains',
    pendenzeClasse: `${Molti(lessico.in('fr').pendenza)} de la classe`,
    archivio: 'Archive des documents',
    archivioAiuto: 'Qui a rendu et qui pas, feuille par feuille',
    assenze: 'Absences',
    assenzeAiuto: 'Les absences de la classe, à justifier et à compter',
    messaggistica: 'Messagerie',
    messaggisticaAiuto: 'Adresses de contact et communications aux familles',
    impostazioni: 'Paramètres',
    impostazioniAiuto:
      'Journée et fermetures, barème, papier à en-tête, courrier, modèles de langage',
    guida: 'Aide',
    guidaAiuto: 'Comment utiliser le registre, en une page',
    gruppi: {
      agenda: 'Agenda',
      registro: 'Registre',
      progettazione: 'Planification',
      classe: 'Maître de classe',
      anno: 'L’année',
      sistema: 'Le programme',
    },
    registroDi: (corso) => `Registre — ${corso}`,
    progettazioneDi: (corso) => `Planification — ${corso}`,
    docenteDi: (classe) => `Maître de classe — ${classe}`,
    schedaPersona: 'Fiche de la personne',
  },
  en: {
    nessunaLezione: 'This course has no lessons yet.',
    dashboard: 'Dashboard',
    oggiAiuto:
      'The day at a glance: today’s lessons, what is still open, and where to go next',
    calendario: 'Calendar',
    calendarioAiuto: 'The lessons of all classes together, week by week',
    pendenze: Molti(lessico.in('en').pendenza),
    pendenzeAiuto: 'What has been handed out and has not come back yet',
    classi: Molti(lessico.in('en').classe),
    classiAiuto: 'The list of classes and their groups',
    persone: Molti(lessico.in('en').pif),
    personeAiuto:
      'Everyone in the year in a single list, with their record alongside',
    mappa: 'Map',
    mappaAiuto:
      'Where they live, where they work, and how far they are from school',
    corsi: Molti(lessico.in('en').corso),
    corsiAiuto:
      'Which subject for which class, in a grid: and below, the chosen course',
    daSmistare: 'To sort',
    daSmistareAiuto:
      'The loaded PDFs waiting to be split, from all your classes',
    lezione: Uno(lessico.in('en').lezione),
    lezioneAiuto: 'Attendance, topics and assignments of the lesson',
    valutazioni: 'Assessments',
    valutazioniAiuto: 'The course’s assessments and their grades',
    check: 'Check',
    checkAiuto:
      'Things to do once, ticked off person by person with their date',
    checkClasse: 'Class check',
    checkClasseAiuto: 'Things to check for the class as its class teacher',
    piani: Molti(lessico.in('en').pianoLezione),
    pianiAiuto: 'How a lesson is built before you teach it',
    progetti: Molti(lessico.in('en').progetto),
    progettiAiuto: 'The course projects: tasks, criteria, level grid and comments',
    overview: 'Overview',
    overviewAiuto: 'Overview of lessons, plans, projects, and connected resources',
    documenti: 'Documents',
    documentiAiuto:
      'What leaves the register and goes into other people’s hands',
    pendenzeClasse: `Class ${lessico.in('en').pendenza.plurale}`,
    archivio: 'Document archive',
    archivioAiuto: 'Who has handed in and who hasn’t, sheet by sheet',
    assenze: 'Absences',
    assenzeAiuto: 'The class’s absences, to excuse and to count',
    messaggistica: 'Messaging',
    messaggisticaAiuto: 'Contact addresses and messages to families',
    impostazioni: 'Settings',
    impostazioniAiuto:
      'School day and closures, grading scale, letterheads, mail, language models',
    guida: 'Help',
    guidaAiuto: 'How to use the register, on one page',
    gruppi: {
      agenda: 'Planner',
      registro: 'Register',
      progettazione: 'Planning',
      classe: 'Class teacher',
      anno: 'The year',
      sistema: 'The program',
    },
    registroDi: (corso) => `Register — ${corso}`,
    progettazioneDi: (corso) => `Planning — ${corso}`,
    docenteDi: (classe) => `Class teacher — ${classe}`,
    schedaPersona: 'Learner’s record',
  },
})

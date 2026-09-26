// I testi della pagina della guida (`help.ts`). Le sezioni hanno i loro
// cataloghi in `help/`.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'
import type { ParteGuida } from './help/types.js'

const it = {
  titolo: 'Guida',
  sottotitolo: 'che cosa fa ogni pagina, e come si usa',
  /**
   * I nomi delle parti, nell'ordine dell'indice. I cinque della barra laterale
   * sono i nomi dei suoi gruppi.
   */
  parti: {
    inizio: 'Per cominciare',
    agenda: 'Agenda',
    registro: 'Registro',
    docenteClasse: 'Docente di classe',
    anno: 'L’anno',
    programma: 'Il programma',
    fuori: 'Fuori dalla finestra',
    quinte: 'Dietro le quinte',
  } satisfies Record<ParteGuida, string>,
  conto: (sezioni: number, voci: number, figure: number) =>
    `${sezioni} sezioni · ${voci} voci · ${figure} figure`,
  vociTrovate: (quante: number) => plurale(quante, 'voce trovata', 'voci trovate'),

  // Le figure.
  figura: (numero: string) => `Figura ${numero}`,
  figureDellaSezione: (quante: number) => `${quante} ${quante === 1 ? 'figura' : 'figure'}`,
  ingrandisci: 'Ingrandisci la figura',
  ingrandisciLa: (numero: string) => `Ingrandisci la figura ${numero}`,
  figuraIngrandita: 'Figura ingrandita',
  vaiAllaSezione: 'Vai alla sezione',
  diQuante: (questa: number, tutte: number) => `${questa} di ${tutte}`,
  precedente: 'Figura precedente (←)',
  successiva: 'Figura successiva (→)',
  chiudi: 'Chiudi (Esc)',

  // Le sezioni.
  note: {
    meccanismo: 'Come funziona',
    consiglio: 'Consiglio',
  },
  vediAnche: 'Vedi anche',
  poi: 'Poi',
  apriLaPagina: 'Apri la pagina',
  apriLaPaginaDi: (titolo: string) => `Apri la pagina: ${titolo}`,

  // L'indice.
  indice: 'Indice della guida',
  doveSiTrova: 'Dove si trova',
  argomenti: 'Argomenti',

  // La ricerca.
  /** Il tasto che la casella mostra a destra quando c'è scritto qualcosa. */
  tastoInvio: 'Invio',
  segnaposto: 'Che cosa vuoi fare? «segnare un’assenza», «media», «Ctrl»…',
  cercaNellaGuida: 'Cerca nella guida',
  risposteMigliori: 'Risposte migliori',
  nienteTitolo: 'Niente che si chiami così',
  nienteTesto:
    'Prova con una parola sola, o con il nome di un pulsante com’è scritto sullo ' +
    'schermo. Ctrl+K cerca invece fra le pagine e i comandi.',
  forseCercavi: (parola: string) => `Forse cercavi «${parola}»`,
  mostraTutta: 'Mostra tutta la guida',

  // Il benvenuto.
  benvenutoTitolo: 'Tutto il registro, pagina per pagina',
  benvenutoTesto:
    'Scrivi quel che vuoi fare, con parole tue: la guida capisce anche «voto» per ' +
    '«valutazione». `F1` da qualunque pagina apre la sua sezione; un clic su una ' +
    'figura la ingrandisce, e i numeri si accendono con la loro spiegazione.',
  primiPassi: 'Primi passi',
  scorciatoie: 'Scorciatoie',
  guai: 'Se qualcosa non torna',
  prova: 'Prova:',
  /** Le parole da provare, per chi non sa da dove cominciare: ognuna trova qualcosa. */
  daProvare: ['assenza', 'voto', 'rapporti', 'copia', 'proiettare', 'dettatura', 'consegna', 'Ctrl'],
  staviGuardando: 'Stavi guardando ',
  leggiCome: 'Leggi come funziona',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Hilfe',
    sottotitolo: 'was jede Seite tut, und wie man sie benutzt',
    parti: {
      inizio: 'Zum Einstieg',
      agenda: 'Agenda',
      registro: 'Klassenbuch',
      docenteClasse: 'Klassenlehrperson',
      anno: 'Schuljahr',
      programma: 'Programm',
      fuori: 'Ausserhalb des Fensters',
      quinte: 'Hinter den Kulissen',
    },
    conto: (sezioni, voci, figure) =>
      `${sezioni} Abschnitte · ${voci} Einträge · ${figure} Abbildungen`,
    vociTrovate: (quante) => plurale(quante, 'Eintrag gefunden', 'Einträge gefunden'),
    figura: (numero) => `Abbildung ${numero}`,
    figureDellaSezione: (quante) => `${quante} ${quante === 1 ? 'Abbildung' : 'Abbildungen'}`,
    ingrandisci: 'Abbildung vergrössern',
    ingrandisciLa: (numero) => `Abbildung ${numero} vergrössern`,
    figuraIngrandita: 'Vergrösserte Abbildung',
    vaiAllaSezione: 'Zum Abschnitt',
    diQuante: (questa, tutte) => `${questa} von ${tutte}`,
    precedente: 'Vorherige Abbildung (←)',
    successiva: 'Nächste Abbildung (→)',
    chiudi: 'Schliessen (Esc)',
    note: {
      meccanismo: 'So funktioniert es',
      consiglio: 'Tipp',
    },
    vediAnche: 'Siehe auch',
    poi: 'Weiter',
    apriLaPagina: 'Seite öffnen',
    apriLaPaginaDi: (titolo) => `Seite öffnen: ${titolo}`,
    indice: 'Inhalt der Hilfe',
    doveSiTrova: 'Wo es steht',
    argomenti: 'Themen',
    tastoInvio: 'Enter',
    segnaposto: 'Was möchtest du tun? «Absenz eintragen», «Durchschnitt», «Ctrl»…',
    cercaNellaGuida: 'In der Hilfe suchen',
    risposteMigliori: 'Beste Antworten',
    nienteTitolo: 'Nichts mit diesem Namen',
    nienteTesto:
      'Versuch es mit einem einzigen Wort, oder mit dem Namen einer Schaltfläche, so ' +
      'wie er auf dem Bildschirm steht. Ctrl+K sucht dagegen unter den Seiten und Befehlen.',
    forseCercavi: (parola) => `Meintest du «${parola}»?`,
    mostraTutta: 'Ganze Hilfe anzeigen',
    benvenutoTitolo: 'Das ganze Klassenbuch, Seite für Seite',
    benvenutoTesto:
      'Schreib, was du tun möchtest, mit deinen eigenen Worten: Die Hilfe versteht auch ' +
      '«Test» für «Prüfung». `F1` öffnet von jeder Seite aus ihren Abschnitt; ein Klick auf ' +
      'eine Abbildung vergrössert sie, und die Zahlen leuchten mit ihrer Erklärung auf.',
    primiPassi: 'Erste Schritte',
    scorciatoie: 'Tastenkürzel',
    guai: 'Wenn etwas nicht stimmt',
    prova: 'Probier:',
    daProvare: ['Absenz', 'Note', 'Bericht', 'Kopie', 'projizieren', 'Diktat', 'Auftrag', 'Ctrl'],
    staviGuardando: 'Du kommst von ',
    leggiCome: 'So funktioniert es',
  },
  fr: {
    titolo: 'Aide',
    sottotitolo: 'ce que fait chaque page, et comment s’en servir',
    parti: {
      inizio: 'Pour commencer',
      agenda: 'Agenda',
      registro: 'Registre',
      docenteClasse: 'Maître de classe',
      anno: 'L’année',
      programma: 'Le programme',
      fuori: 'Hors de la fenêtre',
      quinte: 'En coulisses',
    },
    conto: (sezioni, voci, figure) =>
      `${sezioni} sections · ${voci} entrées · ${figure} figures`,
    vociTrovate: (quante) => plurale(quante, 'entrée trouvée', 'entrées trouvées'),
    figura: (numero) => `Figure ${numero}`,
    figureDellaSezione: (quante) => `${quante} ${quante === 1 ? 'figure' : 'figures'}`,
    ingrandisci: 'Agrandir la figure',
    ingrandisciLa: (numero) => `Agrandir la figure ${numero}`,
    figuraIngrandita: 'Figure agrandie',
    vaiAllaSezione: 'Aller à la section',
    diQuante: (questa, tutte) => `${questa} sur ${tutte}`,
    precedente: 'Figure précédente (←)',
    successiva: 'Figure suivante (→)',
    chiudi: 'Fermer (Échap)',
    note: {
      meccanismo: 'Comment ça marche',
      consiglio: 'Conseil',
    },
    vediAnche: 'Voir aussi',
    poi: 'Ensuite',
    apriLaPagina: 'Ouvrir la page',
    apriLaPaginaDi: (titolo) => `Ouvrir la page : ${titolo}`,
    indice: 'Table des matières de l’aide',
    doveSiTrova: 'Où ça se trouve',
    argomenti: 'Sujets',
    tastoInvio: 'Entrée',
    segnaposto: 'Que veux-tu faire ? « noter une absence », « moyenne », « Ctrl »…',
    cercaNellaGuida: 'Chercher dans l’aide',
    risposteMigliori: 'Meilleures réponses',
    nienteTitolo: 'Rien de ce nom',
    nienteTesto:
      'Essaie avec un seul mot, ou avec le nom d’un bouton tel qu’il est écrit à l’écran. ' +
      'Ctrl+K cherche, lui, parmi les pages et les commandes.',
    forseCercavi: (parola) => `Voulais-tu dire « ${parola} » ?`,
    mostraTutta: 'Afficher toute l’aide',
    benvenutoTitolo: 'Tout le registre, page par page',
    benvenutoTesto:
      'Écris ce que tu veux faire, avec tes mots : l’aide comprend aussi « test » pour ' +
      '« épreuve ». `F1` ouvre depuis n’importe quelle page sa section ; un clic sur une ' +
      'figure l’agrandit, et les numéros s’allument avec leur explication.',
    primiPassi: 'Premiers pas',
    scorciatoie: 'Raccourcis',
    guai: 'Si quelque chose cloche',
    prova: 'Essaie :',
    daProvare: ['absence', 'note', 'rapport', 'copie', 'projeter', 'dictée', 'devoir', 'Ctrl'],
    staviGuardando: 'Tu regardais ',
    leggiCome: 'Lire comment ça marche',
  },
  en: {
    titolo: 'Help',
    sottotitolo: 'what every page does, and how to use it',
    parti: {
      inizio: 'Getting started',
      agenda: 'Planner',
      registro: 'Register',
      docenteClasse: 'Class teacher',
      anno: 'The year',
      programma: 'The program',
      fuori: 'Outside the window',
      quinte: 'Behind the scenes',
    },
    conto: (sezioni, voci, figure) =>
      `${sezioni} sections · ${voci} items · ${figure} figures`,
    vociTrovate: (quante) => plurale(quante, 'item found', 'items found'),
    figura: (numero) => `Figure ${numero}`,
    figureDellaSezione: (quante) => `${quante} ${quante === 1 ? 'figure' : 'figures'}`,
    ingrandisci: 'Enlarge the figure',
    ingrandisciLa: (numero) => `Enlarge figure ${numero}`,
    figuraIngrandita: 'Enlarged figure',
    vaiAllaSezione: 'Go to the section',
    diQuante: (questa, tutte) => `${questa} of ${tutte}`,
    precedente: 'Previous figure (←)',
    successiva: 'Next figure (→)',
    chiudi: 'Close (Esc)',
    note: {
      meccanismo: 'How it works',
      consiglio: 'Tip',
    },
    vediAnche: 'See also',
    poi: 'Next',
    apriLaPagina: 'Open the page',
    apriLaPaginaDi: (titolo) => `Open the page: ${titolo}`,
    indice: 'Guide contents',
    doveSiTrova: 'Where it is',
    argomenti: 'Topics',
    tastoInvio: 'Enter',
    segnaposto: 'What do you want to do? “mark an absence”, “average”, “Ctrl”…',
    cercaNellaGuida: 'Search the guide',
    risposteMigliori: 'Best answers',
    nienteTitolo: 'Nothing by that name',
    nienteTesto:
      'Try a single word, or the name of a button as it is written on the screen. Ctrl+K ' +
      'searches the pages and commands instead.',
    forseCercavi: (parola) => `Did you mean “${parola}”?`,
    mostraTutta: 'Show the whole guide',
    benvenutoTitolo: 'The whole register, page by page',
    benvenutoTesto:
      'Type what you want to do, in your own words: the guide also understands “mark” for ' +
      '“grade”. `F1` from any page opens its section; a click on a figure enlarges it, and ' +
      'the numbers light up with their explanation.',
    primiPassi: 'First steps',
    scorciatoie: 'Shortcuts',
    guai: 'If something is not right',
    prova: 'Try:',
    daProvare: ['absence', 'grade', 'report', 'copy', 'project', 'dictation', 'assignment', 'Ctrl'],
    staviGuardando: 'You were looking at ',
    leggiCome: 'Read how it works',
  },
})

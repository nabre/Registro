// Nome e descrizione di ogni modello dei rapporti. Le chiavi sono i file di
// `templates/`: un modello del catalogo senza voce qui non compila.

import { catalogo } from '../i18n/index.js'

/** Quel che si legge di un modello nell'elenco. */
interface TestoModello {
  /** Come si legge nell'elenco. */
  readonly titolo: string
  /** La riga sotto il titolo: di che cosa quel modello decide. */
  readonly aiuto: string
}

type NomeModello =
  | '_base'
  | '_stile'
  | '_testi'
  | '_testi-de'
  | '_testi-fr'
  | '_testi-en'
  | '_blocchi'
  | 'verbale-lezione'
  | 'piano-lezione'
  | 'valutazioni-classe'
  | 'presenze-classe'
  | 'scheda-allievo'
  | 'momento-valutazione'
  | 'fascicolo-classe'
  | 'foto-classe'
  | '_firma.html'

const it: { readonly modelli: Readonly<Record<NomeModello, TestoModello>> } = {
  modelli: {
    _base: {
      titolo: 'Intestazione e piede',
      aiuto: 'La testata e il piè di pagina di tutti i rapporti: dove vanno la sede, il logo e il nome, che sono del documento',
    },
    _stile: {
      titolo: 'Misure del foglio',
      aiuto: 'Formato, margini, corpi del testo, altezza delle righe: quanto è grande tutto',
    },
    _testi: {
      titolo: 'Frasi e nomi delle colonne',
      aiuto: 'Come il registro dice le cose: le frasi con dentro un numero, i titoli delle colonne',
    },
    '_testi-de': {
      titolo: 'Frasi in tedesco',
      aiuto: 'Le stesse parole dei rapporti, per quando il registro parla tedesco',
    },
    '_testi-fr': {
      titolo: 'Frasi in francese',
      aiuto: 'Le stesse parole dei rapporti, per quando il registro parla francese',
    },
    '_testi-en': {
      titolo: 'Frasi in inglese',
      aiuto: 'Le stesse parole dei rapporti, per quando il registro parla inglese',
    },
    _blocchi: {
      titolo: 'Pezzi riusabili',
      aiuto: 'I pezzi di corpo che più rapporti richiamano con «usa:»: l’apertura, l’appello',
    },
    'verbale-lezione': {
      titolo: 'Verbale della lezione',
      aiuto: 'Il foglio di un’ora svolta: appello, consuntivo, osservazioni',
    },
    'piano-lezione': {
      titolo: 'Piano lezione',
      aiuto: 'La scaletta di un’ora, da avere in mano prima di entrare',
    },
    'valutazioni-classe': {
      titolo: 'Griglia dei voti',
      aiuto: 'Una riga per allievo, una colonna per prova, e la media in fondo',
    },
    'presenze-classe': {
      titolo: 'Presenze della classe',
      aiuto: 'Assenze, ritardi e percentuali di un corso nel periodo scelto',
    },
    'scheda-allievo': {
      titolo: 'Scheda personale',
      aiuto: 'Il foglio di una persona in formazione: voti, presenze, osservazioni',
    },
    'momento-valutazione': {
      titolo: 'Scheda di una prova',
      aiuto: 'Una prova per esteso, con la distribuzione dei voti',
    },
    'fascicolo-classe': {
      titolo: 'Fascicolo di classe',
      aiuto: 'Il quadro della classe per chi ne è docente: recapiti, documenti, assenze',
    },
    'foto-classe': {
      titolo: 'Parete di ritratti',
      aiuto: 'Le facce della classe su un foglio solo, con i nomi sotto',
    },
    '_firma.html': {
      titolo: 'Firma delle e-mail',
      aiuto: 'Quel che il registro mette in fondo a ogni messaggio che spedisce, se il documento non ne ha una sua. È HTML',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    modelli: {
      _base: {
        titolo: 'Kopf- und Fusszeile',
        aiuto: 'Kopf und Fuss aller Berichte: wo Schule, Logo und Name stehen, die zum Dokument gehören',
      },
      _stile: {
        titolo: 'Blattmasse',
        aiuto: 'Format, Ränder, Schriftgrössen, Zeilenhöhe: wie gross alles ist',
      },
      _testi: {
        titolo: 'Sätze und Spaltennamen',
        aiuto: 'Wie das Klassenbuch die Dinge sagt: die Sätze mit einer Zahl darin, die Spaltentitel',
      },
      '_testi-de': {
        titolo: 'Sätze auf Deutsch',
        aiuto: 'Dieselben Wörter der Berichte, für den Fall, dass das Klassenbuch Deutsch spricht',
      },
      '_testi-fr': {
        titolo: 'Sätze auf Französisch',
        aiuto: 'Dieselben Wörter der Berichte, für den Fall, dass das Klassenbuch Französisch spricht',
      },
      '_testi-en': {
        titolo: 'Sätze auf Englisch',
        aiuto: 'Dieselben Wörter der Berichte, für den Fall, dass das Klassenbuch Englisch spricht',
      },
      _blocchi: {
        titolo: 'Wiederverwendbare Teile',
        aiuto: 'Die Teile, die mehrere Berichte mit «usa:» aufrufen: der Anfang, die Präsenzkontrolle',
      },
      'verbale-lezione': {
        titolo: 'Unterrichtsprotokoll',
        aiuto: 'Das Blatt einer gehaltenen Stunde: Präsenzkontrolle, Rückblick, Beobachtungen',
      },
      'piano-lezione': {
        titolo: 'Unterrichtsplan',
        aiuto: 'Der Ablauf einer Stunde, zum Mitnehmen ins Schulzimmer',
      },
      'valutazioni-classe': {
        titolo: 'Notenraster',
        aiuto: 'Eine Zeile pro Lernende, eine Spalte pro Prüfung, und unten der Durchschnitt',
      },
      'presenze-classe': {
        titolo: 'Anwesenheit der Klasse',
        aiuto: 'Absenzen, Verspätungen und Prozente eines Kurses im gewählten Zeitraum',
      },
      'scheda-allievo': {
        titolo: 'Personenblatt',
        aiuto: 'Das Blatt einer lernenden Person: Noten, Anwesenheit, Beobachtungen',
      },
      'momento-valutazione': {
        titolo: 'Blatt einer Prüfung',
        aiuto: 'Eine Prüfung ausführlich, mit der Verteilung der Noten',
      },
      'fascicolo-classe': {
        titolo: 'Klassendossier',
        aiuto: 'Die Übersicht der Klasse für die Klassenlehrperson: Kontaktadressen, Dokumente, Absenzen',
      },
      'foto-classe': {
        titolo: 'Fotowand',
        aiuto: 'Die Gesichter der Klasse auf einem einzigen Blatt, mit den Namen darunter',
      },
      '_firma.html': {
        titolo: 'E-Mail-Signatur',
        aiuto: 'Was das Klassenbuch unter jede Nachricht setzt, wenn das Dokument keine eigene hat. Es ist HTML',
      },
    },
  },
  fr: {
    modelli: {
      _base: {
        titolo: 'En-tête et pied de page',
        aiuto: 'L’en-tête et le pied de page de tous les rapports : où vont l’école, le logo et le nom, qui appartiennent au document',
      },
      _stile: {
        titolo: 'Mesures de la feuille',
        aiuto: 'Format, marges, corps du texte, hauteur des lignes : la taille de tout',
      },
      _testi: {
        titolo: 'Phrases et noms des colonnes',
        aiuto: 'Comment le registre dit les choses : les phrases qui contiennent un nombre, les titres des colonnes',
      },
      '_testi-de': {
        titolo: 'Phrases en allemand',
        aiuto: 'Les mêmes mots des rapports, pour quand le registre parle allemand',
      },
      '_testi-fr': {
        titolo: 'Phrases en français',
        aiuto: 'Les mêmes mots des rapports, pour quand le registre parle français',
      },
      '_testi-en': {
        titolo: 'Phrases en anglais',
        aiuto: 'Les mêmes mots des rapports, pour quand le registre parle anglais',
      },
      _blocchi: {
        titolo: 'Éléments réutilisables',
        aiuto: 'Les morceaux que plusieurs rapports appellent avec « usa: » : l’ouverture, l’appel',
      },
      'verbale-lezione': {
        titolo: 'Procès-verbal de la leçon',
        aiuto: 'La feuille d’une leçon donnée : appel, bilan, observations',
      },
      'piano-lezione': {
        titolo: 'Plan de leçon',
        aiuto: 'Le déroulement d’une leçon, à avoir en main avant d’entrer en classe',
      },
      'valutazioni-classe': {
        titolo: 'Grille des notes',
        aiuto: 'Une ligne par personne en formation, une colonne par épreuve, et la moyenne en bas',
      },
      'presenze-classe': {
        titolo: 'Présences de la classe',
        aiuto: 'Absences, retards et pourcentages d’un cours sur l’intervalle choisi',
      },
      'scheda-allievo': {
        titolo: 'Fiche personnelle',
        aiuto: 'La feuille d’une personne en formation : notes, présences, observations',
      },
      'momento-valutazione': {
        titolo: 'Fiche d’une épreuve',
        aiuto: 'Une épreuve en détail, avec la répartition des notes',
      },
      'fascicolo-classe': {
        titolo: 'Dossier de classe',
        aiuto: 'Le tableau de la classe pour son maître de classe : adresses de contact, documents, absences',
      },
      'foto-classe': {
        titolo: 'Mur de portraits',
        aiuto: 'Les visages de la classe sur une seule feuille, avec les noms dessous',
      },
      '_firma.html': {
        titolo: 'Signature des e-mails',
        aiuto: 'Ce que le registre ajoute au bas de chaque message qu’il envoie, si le document n’a pas la sienne. C’est du HTML',
      },
    },
  },
  en: {
    modelli: {
      _base: {
        titolo: 'Header and footer',
        aiuto: 'The header and footer of every report: where the school, the logo and the name go, which belong to the document',
      },
      _stile: {
        titolo: 'Page measurements',
        aiuto: 'Format, margins, text sizes, row height: how big everything is',
      },
      _testi: {
        titolo: 'Phrases and column names',
        aiuto: 'How the register puts things: the phrases with a number in them, the column headings',
      },
      '_testi-de': {
        titolo: 'Phrases in German',
        aiuto: 'The same report wording, for when the register speaks German',
      },
      '_testi-fr': {
        titolo: 'Phrases in French',
        aiuto: 'The same report wording, for when the register speaks French',
      },
      '_testi-en': {
        titolo: 'Phrases in English',
        aiuto: 'The same report wording, for when the register speaks English',
      },
      _blocchi: {
        titolo: 'Reusable pieces',
        aiuto: 'The pieces several reports call with “usa:”: the opening, the attendance',
      },
      'verbale-lezione': {
        titolo: 'Lesson record',
        aiuto: 'The sheet of a lesson that was held: attendance, review, observations',
      },
      'piano-lezione': {
        titolo: 'Lesson plan',
        aiuto: 'The outline of a lesson, to have in hand before going in',
      },
      'valutazioni-classe': {
        titolo: 'Grade grid',
        aiuto: 'One row per learner, one column per test, and the average at the bottom',
      },
      'presenze-classe': {
        titolo: 'Class attendance',
        aiuto: 'Absences, late arrivals and percentages of a course over the chosen period',
      },
      'scheda-allievo': {
        titolo: 'Personal sheet',
        aiuto: 'The sheet of one learner: grades, attendance, observations',
      },
      'momento-valutazione': {
        titolo: 'Test sheet',
        aiuto: 'One test in full, with the distribution of grades',
      },
      'fascicolo-classe': {
        titolo: 'Class file',
        aiuto: 'The overview of the class for its class teacher: contact addresses, documents, absences',
      },
      'foto-classe': {
        titolo: 'Portrait wall',
        aiuto: 'The faces of the class on a single sheet, with the names underneath',
      },
      '_firma.html': {
        titolo: 'Email signature',
        aiuto: 'What the register adds at the bottom of every message it sends, if the document has none of its own. It is HTML',
      },
    },
  },
})

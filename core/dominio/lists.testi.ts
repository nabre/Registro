// I testi delle liste di sistema (`lists.ts`): nome, dove si vede, e le voci
// iniziali delle liste aperte. Le voci delle liste chiuse sono i tipi del
// lessico; quelle delle aperte, una volta rinominate, vivono nel documento.

import { catalogo } from '../i18n/index.js'

const it = {
  liste: {
    tipoAttivita: {
      etichetta: 'Tipi di attività',
      descrizione: 'la tendina «Tipo» di ogni tappa della scaletta di un piano lezione',
    },
    tipoValutazione: {
      etichetta: 'Tipi di prova',
      descrizione: 'la tendina del tipo, nella prova di una tappa e nel momento di valutazione',
    },
    raggruppamento: {
      etichetta: 'Come lavora la classe',
      descrizione: 'in plenaria, a coppie, in gruppi: la tendina nel dettaglio di una tappa',
    },
    supporto: {
      etichetta: 'Supporti della spiegazione',
      descrizione: 'con che cosa si spiega: nel dettaglio di una tappa di tipo Spiegazione',
    },
    correzione: {
      etichetta: 'Dove si corregge un esercizio',
      descrizione: 'nel dettaglio di una tappa di tipo Esercizio',
    },
    composizioneGruppi: {
      etichetta: 'Come si formano i gruppi',
      descrizione: 'nel dettaglio di una tappa di tipo Lavoro di gruppo',
    },
    aspettoOsservato: {
      etichetta: 'Aspetti osservati in classe',
      descrizione: 'le colonne della matrice del comportamento, nel registro dell’ora',
    },
    temaDocenza: {
      etichetta: 'Temi della docenza di classe',
      descrizione: 'di che cosa si tratta nell’ora da docente di classe',
    },
    tipoSettimana: {
      etichetta: 'Tipi di settimana',
      descrizione:
        'i nomi delle settimane dell’orario a turni — A e B, o altri —: si danno alle ' +
        'settimane in Anno e orario › Anno scolastico',
    },
  },
  supporto: {
    lavagna: 'Lavagna',
    proiezione: 'Proiezione',
    libro: 'Libro di testo',
    dispensa: 'Dispensa',
  },
  correzione: {
    inClasse: 'In classe',
    aCasa: 'A casa',
    ritirata: 'Ritirata e corretta da me',
  },
  composizioneGruppi: {
    liberi: 'A scelta loro',
    sorteggio: 'A sorteggio',
    assegnati: 'Assegnati da me',
  },
  aspettoOsservato: {
    partecipazione: 'Partecipazione',
    collaborazione: 'Collaborazione',
    rispetto: 'Rispetto delle regole',
    impegno: 'Impegno',
    autonomia: 'Autonomia',
  },
  temaDocenza: {
    comunicazioni: 'Comunicazioni',
    documenti: 'Documenti da raccogliere',
    colloqui: 'Colloqui',
    organizzazione: 'Organizzazione (gite, uscite)',
    disciplina: 'Andamento e disciplina',
  },
  /** Una voce che la lista non ha più, con il nome che aveva. */
  toltaDallElenco: (testo: string) => `${testo} (tolta dall’elenco)`,
}

export const testi = catalogo(it, {
  de: {
    liste: {
      tipoAttivita: {
        etichetta: 'Arten von Aktivitäten',
        descrizione: 'das Auswahlfeld «Art» jeder Etappe im Ablauf eines Unterrichtsplans',
      },
      tipoValutazione: {
        etichetta: 'Prüfungsarten',
        descrizione:
          'das Auswahlfeld der Art, bei der Prüfung einer Etappe und bei der ' +
          'Leistungsbeurteilung',
      },
      raggruppamento: {
        etichetta: 'Wie die Klasse arbeitet',
        descrizione: 'im Plenum, zu zweit, in Gruppen: das Auswahlfeld in den Details einer Etappe',
      },
      supporto: {
        etichetta: 'Hilfsmittel der Erklärung',
        descrizione: 'womit erklärt wird: in den Details einer Etappe der Art Erklärung',
      },
      correzione: {
        etichetta: 'Wo eine Übung korrigiert wird',
        descrizione: 'in den Details einer Etappe der Art Übung',
      },
      composizioneGruppi: {
        etichetta: 'Wie die Gruppen gebildet werden',
        descrizione: 'in den Details einer Etappe der Art Gruppenarbeit',
      },
      aspettoOsservato: {
        etichetta: 'Beobachtete Aspekte im Unterricht',
        descrizione: 'die Spalten der Verhaltensmatrix im Protokoll der Stunde',
      },
      temaDocenza: {
        etichetta: 'Themen der Klassenlehrer-Aufgaben',
        descrizione: 'worum es in der Stunde als Klassenlehrperson geht',
      },
      tipoSettimana: {
        etichetta: 'Wochentypen',
        descrizione:
          'die Namen der Wochen im wechselnden Stundenplan — A und B oder andere —: vergeben ' +
          'werden sie unter Schuljahr und Stundenplan › Schuljahr',
      },
    },
    supporto: {
      lavagna: 'Wandtafel',
      proiezione: 'Projektion',
      libro: 'Lehrbuch',
      dispensa: 'Skript',
    },
    correzione: {
      inClasse: 'In der Klasse',
      aCasa: 'Zu Hause',
      ritirata: 'Eingesammelt und von mir korrigiert',
    },
    composizioneGruppi: {
      liberi: 'Frei gewählt',
      sorteggio: 'Ausgelost',
      assegnati: 'Von mir eingeteilt',
    },
    aspettoOsservato: {
      partecipazione: 'Mitarbeit',
      collaborazione: 'Zusammenarbeit',
      rispetto: 'Einhalten der Regeln',
      impegno: 'Einsatz',
      autonomia: 'Selbstständigkeit',
    },
    temaDocenza: {
      comunicazioni: 'Mitteilungen',
      documenti: 'Einzusammelnde Dokumente',
      colloqui: 'Gespräche',
      organizzazione: 'Organisation (Ausflüge, Exkursionen)',
      disciplina: 'Verlauf und Disziplin',
    },
    toltaDallElenco: (testo) => `${testo} (aus der Liste entfernt)`,
  },
  fr: {
    liste: {
      tipoAttivita: {
        etichetta: 'Types d’activité',
        descrizione: 'la liste « Type » de chaque étape du déroulement d’un plan de leçon',
      },
      tipoValutazione: {
        etichetta: 'Types d’épreuve',
        descrizione: 'la liste du type, dans l’épreuve d’une étape et dans l’évaluation',
      },
      raggruppamento: {
        etichetta: 'Comment travaille la classe',
        descrizione: 'en plénière, par deux, en groupes : la liste dans le détail d’une étape',
      },
      supporto: {
        etichetta: 'Supports de l’explication',
        descrizione: 'avec quoi on explique : dans le détail d’une étape de type Explication',
      },
      correzione: {
        etichetta: 'Où l’on corrige un exercice',
        descrizione: 'dans le détail d’une étape de type Exercice',
      },
      composizioneGruppi: {
        etichetta: 'Comment se forment les groupes',
        descrizione: 'dans le détail d’une étape de type Travail de groupe',
      },
      aspettoOsservato: {
        etichetta: 'Aspects observés en classe',
        descrizione: 'les colonnes de la grille du comportement, dans le registre de la leçon',
      },
      temaDocenza: {
        etichetta: 'Thèmes de la maîtrise de classe',
        descrizione: 'ce dont il est question pendant la leçon de maîtrise de classe',
      },
      tipoSettimana: {
        etichetta: 'Types de semaine',
        descrizione:
          'les noms des semaines de l’horaire alterné — A et B, ou d’autres — : on les attribue ' +
          'aux semaines dans Année et horaire › Année scolaire',
      },
    },
    supporto: {
      lavagna: 'Tableau noir',
      proiezione: 'Projection',
      libro: 'Manuel',
      dispensa: 'Polycopié',
    },
    correzione: {
      inClasse: 'En classe',
      aCasa: 'À la maison',
      ritirata: 'Ramassé et corrigé par moi',
    },
    composizioneGruppi: {
      liberi: 'À leur choix',
      sorteggio: 'Par tirage au sort',
      assegnati: 'Formés par moi',
    },
    aspettoOsservato: {
      partecipazione: 'Participation',
      collaborazione: 'Collaboration',
      rispetto: 'Respect des règles',
      impegno: 'Engagement',
      autonomia: 'Autonomie',
    },
    temaDocenza: {
      comunicazioni: 'Communications',
      documenti: 'Documents à recueillir',
      colloqui: 'Entretiens',
      organizzazione: 'Organisation (courses d’école, sorties)',
      disciplina: 'Progression et discipline',
    },
    toltaDallElenco: (testo) => `${testo} (retiré de la liste)`,
  },
  en: {
    liste: {
      tipoAttivita: {
        etichetta: 'Activity types',
        descrizione: 'the “Type” drop-down on each step of a lesson plan’s outline',
      },
      tipoValutazione: {
        etichetta: 'Test types',
        descrizione: 'the type drop-down, in a step’s test and in the assessment',
      },
      raggruppamento: {
        etichetta: 'How the class works',
        descrizione: 'as a whole class, in pairs, in groups: the drop-down in a step’s details',
      },
      supporto: {
        etichetta: 'Explanation aids',
        descrizione: 'what you explain with: in the details of an Explanation step',
      },
      correzione: {
        etichetta: 'Where an exercise is corrected',
        descrizione: 'in the details of an Exercise step',
      },
      composizioneGruppi: {
        etichetta: 'How groups are formed',
        descrizione: 'in the details of a Group work step',
      },
      aspettoOsservato: {
        etichetta: 'Aspects observed in class',
        descrizione: 'the columns of the behaviour grid, in the lesson record',
      },
      temaDocenza: {
        etichetta: 'Class teacher topics',
        descrizione: 'what the class teacher lesson is about',
      },
      tipoSettimana: {
        etichetta: 'Week types',
        descrizione:
          'the names of the weeks in a rotating timetable — A and B, or others —: you assign ' +
          'them to weeks in Year and timetable › School year',
      },
    },
    supporto: {
      lavagna: 'Board',
      proiezione: 'Projector',
      libro: 'Textbook',
      dispensa: 'Handout',
    },
    correzione: {
      inClasse: 'In class',
      aCasa: 'At home',
      ritirata: 'Collected and marked by me',
    },
    composizioneGruppi: {
      liberi: 'Their own choice',
      sorteggio: 'Drawn by lot',
      assegnati: 'Assigned by me',
    },
    aspettoOsservato: {
      partecipazione: 'Participation',
      collaborazione: 'Cooperation',
      rispetto: 'Following the rules',
      impegno: 'Effort',
      autonomia: 'Independence',
    },
    temaDocenza: {
      comunicazioni: 'Announcements',
      documenti: 'Documents to collect',
      colloqui: 'Meetings',
      organizzazione: 'Organisation (trips, outings)',
      disciplina: 'Progress and discipline',
    },
    toltaDallElenco: (testo) => `${testo} (removed from the list)`,
  },
})

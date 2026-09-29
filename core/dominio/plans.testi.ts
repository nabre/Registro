// I testi per la generazione e la gestione dei piani lezione (`core/dominio/plans.ts`).

import { catalogo } from '../i18n/index.js'

const it = {
  obiettivi: {
    concettuale: (materia: string) =>
      materia
        ? `Acquisire i concetti fondamentali trattati nella lezione di ${materia}`
        : 'Acquisire i concetti fondamentali trattati nella lezione',
    operativo: () => 'Applicare le nozioni attraverso esercizi guidati e attività pratiche',
    sintesi: () => 'Consolidare l’apprendimento e verificare la comprensione con restituzione finale',
  },
  attivita: {
    accoglienzaTitolo: 'Accoglienza e richiamo prerequisiti',
    accoglienzaDescrizione:
      'Verifica presenze, breve riepilogo della lezione precedente e presentazione degli obiettivi dell’ora.',
    spiegazioneTitolo: (materia: string) =>
      materia
        ? `Presentazione ed esplorazione dei contenuti di ${materia}`
        : 'Presentazione ed esplorazione dei contenuti',
    spiegazioneDescrizione:
      'Esposizione guidata con esempi alla lavagna o sullo schermo e confronto dialogato con la classe.',
    esercitazioneTitolo: 'Esercitazione guidata e lavoro pratico',
    esercitazioneDescrizione:
      'Esecuzione di esercizi individuali o a coppie con supporto, chiarimenti e guida del docente.',
    laboratorioTitolo: 'Attività di laboratorio e applicazione pratica',
    laboratorioDescrizione:
      'Lavoro operativo su postazioni o strumenti con applicazione diretta delle metodologie.',
    sintesiTitolo: 'Sintesi condivisa, restituzione e consegne',
    sintesiDescrizione:
      'Riepilogo finale dei punti chiave, domande di chiarimento e indicazioni per il lavoro a casa.',
    materialiBase: 'Quaderno, libro di testo o dispense, materiale digitale',
    /** Al posto della materia, per il docente di classe che non ne ha una. */
    classe: 'classe',
  },
}

export const testi = catalogo(it, {
  de: {
    obiettivi: {
      concettuale: (materia) =>
        materia
          ? `Grundlegende Konzepte aus ${materia} verstehen und festigen`
          : 'Grundlegende Konzepte der Lektion verstehen und festigen',
      operativo: () => 'Wissen durch angeleitete Übungen und praktische Aufgaben anwenden',
      sintesi: () => 'Lerninhalte festigen und das Verständnis mit einer Zusammenfassung überprüfen',
    },
    attivita: {
      accoglienzaTitolo: 'Begrüssung und Aktivierung von Vorwissen',
      accoglienzaDescrizione:
        'Präsenzkontrolle, kurze Wiederholung der vorherigen Lektion und Vorstellung der Lernziele.',
      spiegazioneTitolo: (materia) =>
        materia
          ? `Einführung und Erarbeitung der Inhalte von ${materia}`
          : 'Einführung und Erarbeitung der Inhalte',
      spiegazioneDescrizione:
        'Geführte Präsentation mit Beispielen an der Tafel oder am Bildschirm und interaktiver Austausch mit der Klasse.',
      esercitazioneTitolo: 'Angeleitete Übungen und praktische Arbeit',
      esercitazioneDescrizione:
        'Bearbeitung von Aufgaben einzeln oder zu zweit mit Unterstützung und Klärungen der Lehrperson.',
      laboratorioTitolo: 'Laborarbeit und praktische Anwendung',
      laboratorioDescrizione:
        'Praktisches Arbeiten an Arbeitsplätzen oder Geräten mit direkter Anwendung der Methoden.',
      sintesiTitolo: 'Gemeinsame Zusammenfassung, Rückmeldung und Aufträge',
      sintesiDescrizione:
        'Schlussrunde zu den Kernaussagen, Klärung offener Fragen und Hinweise für die Hausaufgaben.',
      materialiBase: 'Heft, Lehrbuch oder Skript, digitale Unterlagen',
      classe: 'Klasse',
    },
  },
  fr: {
    obiettivi: {
      concettuale: (materia) =>
        materia
          ? `Acquérir les concepts fondamentaux de la leçon de ${materia}`
          : 'Acquérir les concepts fondamentaux de la leçon',
      operativo: () => 'Appliquer les notions par des exercices guidés et des travaux pratiques',
      sintesi: () => 'Consolider les apprentissages et vérifier la compréhension avec bilan final',
    },
    attivita: {
      accoglienzaTitolo: 'Accueil et rappel des prérequis',
      accoglienzaDescrizione:
        'Appel, bref rappel de la leçon précédente et présentation des objectifs de l’heure.',
      spiegazioneTitolo: (materia) =>
        materia
          ? `Présentation et étude des contenus de ${materia}`
          : 'Présentation et étude des contenus',
      spiegazioneDescrizione:
        'Exposé guidé avec exemples au tableau ou sur écran et échange dialogué avec la classe.',
      esercitazioneTitolo: 'Exercices guidés et travail pratique',
      esercitazioneDescrizione:
        'Réalisation d’exercices individuels ou en binômes avec accompagnement et explications de l’enseignant.',
      laboratorioTitolo: 'Travaux de laboratoire et application pratique',
      laboratorioDescrizione:
        'Travail pratique aux postes ou avec le matériel en appliquant directement les méthodes.',
      sintesiTitolo: 'Synthèse partagée, bilan et devoirs',
      sintesiDescrizione:
        'Récapitulatif final des points clés, questions et consignes pour le travail à domicile.',
      materialiBase: 'Cahier, manuel ou polycopiés, support numérique',
      classe: 'classe',
    },
  },
  en: {
    obiettivi: {
      concettuale: (materia) =>
        materia
          ? `Understand and acquire the core concepts of the ${materia} lesson`
          : 'Understand and acquire the core concepts of the lesson',
      operativo: () => 'Apply concepts through guided exercises and practical activities',
      sintesi: () => 'Consolidate learning and assess understanding with a final review',
    },
    attivita: {
      accoglienzaTitolo: 'Welcome and recall of prerequisites',
      accoglienzaDescrizione:
        'Attendance check, brief review of previous lesson and introduction to the lesson goals.',
      spiegazioneTitolo: (materia) =>
        materia
          ? `Presentation and exploration of ${materia} contents`
          : 'Presentation and exploration of contents',
      spiegazioneDescrizione:
        'Guided presentation with board/screen examples and interactive discussion with the class.',
      esercitazioneTitolo: 'Guided practice and hands-on work',
      esercitazioneDescrizione:
        'Individual or pair practice tasks with teacher guidance, clarifications and support.',
      laboratorioTitolo: 'Lab activity and practical application',
      laboratorioDescrizione:
        'Hands-on workstation or equipment work with direct application of methods.',
      sintesiTitolo: 'Shared wrap-up, feedback, and assignments',
      sintesiDescrizione:
        'Final summary of key takeaways, Q&A and instructions for homework.',
      materialiBase: 'Notebook, textbook or handouts, digital materials',
      classe: 'class',
    },
  },
})

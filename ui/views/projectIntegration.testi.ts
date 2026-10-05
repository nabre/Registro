// I testi di `views/projectIntegration.tsx`: la pagina Integrazione progetti
// della progettazione. Le parti del progetto che ha in comune con la pagina
// Progetti (matrice, compiti, esiti) stanno in `projects.testi.ts`.

import { catalogo } from '#core/i18n/index.js'

/** Quel che se ne va togliendo il progetto dal corso, e quel che resta. */
interface Perdite {
  compiti: number
  giudizi: number
  caselle: number
  tappe: number
}

const it = {
  titolo: 'Integrazione progetti',
  aiuto:
    'I progetti della biblioteca al lavoro con la classe del corso: in quali piani stanno le ' +
    'loro attività, e compiti, matrice a livelli e giudizi.',
  nessunoNelCorso: 'Nessun progetto integrato in questo corso, per ora.',
  nessunIntegrato: 'Nessun progetto integrato',
  nessunIntegratoTesto:
    'Integra un progetto della biblioteca: poi ne porti le attività nei piani di questo corso.',
  integra: 'Integra un progetto…',
  daBiblioteca: 'Dalla biblioteca',
  tuttiIntegrati: 'Tutti i progetti dell’anno sono già nel corso',
  nuovoProgetto: 'Nuovo progetto…',
  apriBiblioteca: 'Apri nella pagina Progetti',
  statoNelCorso: 'Stato nel corso',
  togli: 'Togli dal corso',
  togliereDalCorso: (titolo: string) => `Togliere «${titolo}» dal corso?`,
  togliTesto: (p: Perdite) => {
    const via = [
      p.compiti > 0 ? (p.compiti === 1 ? 'un compito' : `${p.compiti} compiti`) : '',
      p.giudizi > 0 ? (p.giudizi === 1 ? 'un giudizio' : `${p.giudizi} giudizi`) : '',
      p.caselle > 0 ? (p.caselle === 1 ? 'una casella della matrice' : `${p.caselle} caselle della matrice`) : '',
    ].filter(Boolean)
    const perdita = via.length > 0
      ? `Se ne vanno ${via.join(', ')} di questa classe. `
      : 'Con questa classe non c’è ancora lavoro registrato. '
    const tappe = p.tappe > 0
      ? `${p.tappe === 1 ? 'La tappa' : `Le ${p.tappe} tappe`} dei piani del corso ${p.tappe === 1 ? 'resta, sganciata' : 'restano, sganciate'} dal progetto. `
      : ''
    return `${perdita}${tappe}Il progetto resta nella biblioteca.`
  },
  togliConferma: 'Togli dal corso',
  neiPiani: 'Fasi nei piani',
  neiPianiAiuto:
    'Per ogni fase, le attività della scaletta: dove sono già programmate nei piani del corso ' +
    'e quali restano da programmare; sotto, le lezioni con il loro consuntivo.',
  programma: 'Programma in un piano…',
  /** Le altre date oltre la prima, in coda alla pastiglia «Pianificata»: il titolo le elenca. */
  eAltre: (n: number) => `+${n}`,
  oraSenzaPiano: 'senza piano: se ne prepara uno',
  pianoSciolto: 'piano non ancora in una lezione',
  nienteDaProgrammare: 'Nessuna lezione a venire né piano libero nel corso',
  criteriNellaBiblioteca: 'Criteri e livelli si scrivono nella pagina Progetti.',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Projekte einbinden',
    aiuto:
      'Die Projekte der Bibliothek bei der Arbeit mit der Klasse des Kurses: in welchen Plänen ' +
      'ihre Aktivitäten stehen, dazu Aufgaben, Stufenraster und Einschätzungen.',
    nessunoNelCorso: 'Noch kein Projekt in diesen Kurs eingebunden.',
    nessunIntegrato: 'Kein Projekt eingebunden',
    nessunIntegratoTesto:
      'Binde ein Projekt der Bibliothek ein: Danach übernimmst du seine Aktivitäten in die Pläne dieses Kurses.',
    integra: 'Projekt einbinden…',
    daBiblioteca: 'Aus der Bibliothek',
    tuttiIntegrati: 'Alle Projekte des Jahres sind schon im Kurs',
    nuovoProgetto: 'Neues Projekt…',
    apriBiblioteca: 'Auf der Seite Projekte öffnen',
    statoNelCorso: 'Status im Kurs',
    togli: 'Aus dem Kurs entfernen',
    togliereDalCorso: (titolo) => `«${titolo}» aus dem Kurs entfernen?`,
    togliTesto: (p) => {
      const via = [
        p.compiti > 0 ? (p.compiti === 1 ? 'eine Aufgabe' : `${p.compiti} Aufgaben`) : '',
        p.giudizi > 0 ? (p.giudizi === 1 ? 'eine Einschätzung' : `${p.giudizi} Einschätzungen`) : '',
        p.caselle > 0 ? (p.caselle === 1 ? 'ein Rasterfeld' : `${p.caselle} Rasterfelder`) : '',
      ].filter(Boolean)
      const perdita = via.length > 0
        ? `Es verschwinden ${via.join(', ')} dieser Klasse. `
        : 'Mit dieser Klasse ist noch nichts erfasst. '
      const tappe = p.tappe > 0
        ? `${p.tappe === 1 ? 'Der Schritt' : `Die ${p.tappe} Schritte`} in den Plänen des Kurses ${p.tappe === 1 ? 'bleibt' : 'bleiben'}, vom Projekt gelöst. `
        : ''
      return `${perdita}${tappe}Das Projekt bleibt in der Bibliothek.`
    },
    togliConferma: 'Aus dem Kurs entfernen',
    neiPiani: 'Phasen in den Plänen',
    neiPianiAiuto:
      'Für jede Phase die Aktivitäten des Ablaufs: wo sie in den Plänen des Kurses schon stehen ' +
      'und welche noch einzuplanen sind; darunter die Stunden mit ihrem Stand.',
    programma: 'In einem Plan einplanen…',
    eAltre: (n) => `+${n}`,
    oraSenzaPiano: 'ohne Plan: Es wird einer vorbereitet',
    pianoSciolto: 'Plan noch in keiner Stunde',
    nienteDaProgrammare: 'Keine kommende Stunde und kein freier Plan im Kurs',
    criteriNellaBiblioteca: 'Kriterien und Stufen schreibt man auf der Seite Projekte.',
  },
  fr: {
    titolo: 'Intégration des projets',
    aiuto:
      'Les projets de la bibliothèque au travail avec la classe du cours : dans quels plans sont ' +
      'leurs activités, et tâches, grille à niveaux et appréciations.',
    nessunoNelCorso: 'Aucun projet intégré dans ce cours, pour l’instant.',
    nessunIntegrato: 'Aucun projet intégré',
    nessunIntegratoTesto:
      'Intègre un projet de la bibliothèque : ensuite, tu en reportes les activités dans les plans de ce cours.',
    integra: 'Intégrer un projet…',
    daBiblioteca: 'Depuis la bibliothèque',
    tuttiIntegrati: 'Tous les projets de l’année sont déjà dans le cours',
    nuovoProgetto: 'Nouveau projet…',
    apriBiblioteca: 'Ouvrir dans la page Projets',
    statoNelCorso: 'État dans le cours',
    togli: 'Retirer du cours',
    togliereDalCorso: (titolo) => `Retirer « ${titolo} » du cours ?`,
    togliTesto: (p) => {
      const via = [
        p.compiti > 0 ? (p.compiti === 1 ? 'une tâche' : `${p.compiti} tâches`) : '',
        p.giudizi > 0 ? (p.giudizi === 1 ? 'une appréciation' : `${p.giudizi} appréciations`) : '',
        p.caselle > 0 ? (p.caselle === 1 ? 'une case de la grille' : `${p.caselle} cases de la grille`) : '',
      ].filter(Boolean)
      const perdita = via.length > 0
        ? `Disparaissent ${via.join(', ')} de cette classe. `
        : 'Rien n’est encore enregistré avec cette classe. '
      const tappe = p.tappe > 0
        ? `${p.tappe === 1 ? 'L’étape' : `Les ${p.tappe} étapes`} des plans du cours ${p.tappe === 1 ? 'reste, détachée' : 'restent, détachées'} du projet. `
        : ''
      return `${perdita}${tappe}Le projet reste dans la bibliothèque.`
    },
    togliConferma: 'Retirer du cours',
    neiPiani: 'Phases dans les plans',
    neiPianiAiuto:
      'Pour chaque phase, les activités du déroulé : où elles sont déjà programmées dans les plans ' +
      'du cours et lesquelles restent à programmer ; dessous, les périodes avec leur bilan.',
    programma: 'Programmer dans un plan…',
    eAltre: (n) => `+${n}`,
    oraSenzaPiano: 'sans plan : on en prépare un',
    pianoSciolto: 'plan pas encore dans une période',
    nienteDaProgrammare: 'Aucune période à venir ni plan libre dans le cours',
    criteriNellaBiblioteca: 'Critères et niveaux s’écrivent dans la page Projets.',
  },
  en: {
    titolo: 'Project integration',
    aiuto:
      'The library’s projects at work with the course’s class: which plans hold their ' +
      'activities, plus tasks, level grid and comments.',
    nessunoNelCorso: 'No project integrated in this course yet.',
    nessunIntegrato: 'No project integrated',
    nessunIntegratoTesto:
      'Integrate a project from the library: then bring its activities into this course’s plans.',
    integra: 'Integrate a project…',
    daBiblioteca: 'From the library',
    tuttiIntegrati: 'Every project of the year is already in the course',
    nuovoProgetto: 'New project…',
    apriBiblioteca: 'Open on the Projects page',
    statoNelCorso: 'Status in the course',
    togli: 'Remove from course',
    togliereDalCorso: (titolo) => `Remove “${titolo}” from the course?`,
    togliTesto: (p) => {
      const via = [
        p.compiti > 0 ? (p.compiti === 1 ? 'one task' : `${p.compiti} tasks`) : '',
        p.giudizi > 0 ? (p.giudizi === 1 ? 'one comment' : `${p.giudizi} comments`) : '',
        p.caselle > 0 ? (p.caselle === 1 ? 'one grid cell' : `${p.caselle} grid cells`) : '',
      ].filter(Boolean)
      const perdita = via.length > 0
        ? `This class loses ${via.join(', ')}. `
        : 'Nothing is recorded with this class yet. '
      const tappe = p.tappe > 0
        ? `${p.tappe === 1 ? 'The step' : `The ${p.tappe} steps`} in the course’s plans ${p.tappe === 1 ? 'stays' : 'stay'}, unlinked from the project. `
        : ''
      return `${perdita}${tappe}The project stays in the library.`
    },
    togliConferma: 'Remove from course',
    neiPiani: 'Phases in the plans',
    neiPianiAiuto:
      'For each phase, the outline’s activities: where they are already scheduled in the course’s ' +
      'plans and which are still to schedule; below, the lessons with their record.',
    programma: 'Schedule in a plan…',
    eAltre: (n) => `+${n}`,
    oraSenzaPiano: 'no plan: one is prepared',
    pianoSciolto: 'plan not in a lesson yet',
    nienteDaProgrammare: 'No upcoming lesson or free plan in the course',
    criteriNellaBiblioteca: 'Criteria and levels are written on the Projects page.',
  },
})

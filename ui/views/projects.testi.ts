// I testi di `views/projects.ts`: la pagina Progetti del corso.

import { catalogo } from '#core/i18n/index.js'

const it = {
  nuovo: 'Nuovo progetto',
  nessunoNelCorso: 'Questo corso non ha ancora progetti.',
  avanzamentoDi: (titolo: string) => `Compiti finiti in «${titolo}»`,
  documentiDelProgetto: 'Documenti del progetto',
  obiettivi: 'Obiettivi',
  collegamenti: 'Collegamenti',
  testataVuota: 'Né descrizione né obiettivi: aggiungili con «Modifica».',
  criteriELivelli: 'Criteri e livelli',
  criteriAiuto:
    'I criteri sono le righe di giudizio della matrice; i livelli sono la scala con cui ' +
    'si giudica ognuno, dal basso.',
  livelli: 'Livelli',
  nessunCriterio: 'Nessun criterio, per ora.',
  compitiAiuto:
    'Un compito vale per tutti, con una fine comune; ognuno lo comincia quando tocca a ' +
    'lui e può avere una proroga. Clic sull’inizio: comincia oggi; sulla fine: proroga.',
  delGiorno: 'Del giorno',
  progressione: 'Progressione',
  comeGuardare: 'Come guardare la matrice',
  nessunaOra: 'Nessuna lezione',
  inUnOra: 'In una lezione del progetto',
  matrice: 'Matrice',
  matriceAiuto:
    'Ogni giorno ha le sue caselle: date in giorni diversi raccontano la progressione. ' +
    'Clic: il livello dopo; tasto destro: scegli il livello o scrivi una nota.',
  oraChiusa: 'La lezione è conclusa: la matrice di quell’ora si guarda e non si cambia.',
  giudiziAiuto: 'Note datate su una persona o sulla classe intera.',
  nessunaLezione: 'Nessuna attività di un piano è ancora assegnata a questo progetto.',
  svolto: (n: number) => `Svolto il ${n}% delle attività del progetto.`,
  presenze: 'Presenze nelle ore del progetto',
  presenzeAiuto: 'Con le regole dell’appello, solo sulle lezioni con attività del progetto.',
  udPerse: 'UD perse',
  ritardi: 'Ritardi',
  fasi: 'Fasi',
  fasiAiuto:
    'Ogni fase raccoglie le attività dei piani che le assegni: periodo e avanzamento ' +
    'vengono dalle lezioni e dal loro consuntivo.',
  faseSenzaOre: 'nessuna lezione',
  faseVuota: 'Nessuna attività di un piano è in questa fase.',
  parti: 'Parti del progetto',
  esiti: 'Esiti',
  esitiAiuto: 'Giudizi, valutazioni e presenze del progetto',
  statiAttivita: { 'da-fare': 'da fare', svolta: 'svolta', parziale: 'in parte', saltata: 'saltata' },
  valutazioniDelProgetto: 'Valutazioni del progetto',
  valutazioniAiuto:
    'Una prova nasce dall’attività del piano che la dichiara: se l’attività è del progetto, ' +
    'anche la prova lo è. Qui si collegano anche quelle nate prima.',
  collegaValutazione: 'Collega una valutazione…',
  nessunMomentoLibero: 'Nessuna valutazione del corso da collegare',
  nessunaValutazione: 'Nessuna valutazione collegata.',
  staccaValutazione: (titolo: string) => `Stacca «${titolo}» dal progetto`,
  nessunCorso: 'Nessun corso',
  progettiInUnCorso: 'I progetti stanno in un corso: creane uno nella pagina Corsi.',
  vaiAiCorsi: 'Vai ai corsi',
  aiuto:
    'Un progetto raccoglie compiti con inizio per persona, criteri a livelli, giudizi e ' +
    'le lezioni in cui ci si lavora.',
  nessunProgetto: 'Nessun progetto',
  nessunProgettoTesto: 'Crea il primo progetto del corso: titolo, obiettivi, compiti e criteri.',
}

export const testi = catalogo(it, {
  de: {
    nuovo: 'Neues Projekt',
    nessunoNelCorso: 'Dieser Kurs hat noch keine Projekte.',
    avanzamentoDi: (titolo) => `Erledigte Aufgaben in «${titolo}»`,
    documentiDelProgetto: 'Dokumente des Projekts',
    obiettivi: 'Ziele',
    collegamenti: 'Links',
    testataVuota: 'Weder Beschreibung noch Ziele: Füge sie mit «Bearbeiten» hinzu.',
    criteriELivelli: 'Kriterien und Stufen',
    criteriAiuto:
      'Die Kriterien sind die Zeilen des Rasters; die Stufen sind die Skala, mit der ' +
      'jedes beurteilt wird, von unten.',
    livelli: 'Stufen',
    nessunCriterio: 'Noch kein Kriterium.',
    compitiAiuto:
      'Eine Aufgabe gilt für alle, mit gemeinsamem Ende; jede Person beginnt, wenn sie ' +
      'an der Reihe ist, und kann eine Verlängerung haben. Klick auf den Beginn: beginnt ' +
      'heute; auf das Ende: Verlängerung.',
    delGiorno: 'Des Tages',
    progressione: 'Verlauf',
    comeGuardare: 'Wie das Raster angezeigt wird',
    nessunaOra: 'Keine Stunde',
    inUnOra: 'In einer Stunde des Projekts',
    matrice: 'Raster',
    matriceAiuto:
      'Jeder Tag hat seine Felder: Felder an verschiedenen Tagen zeigen den Verlauf. ' +
      'Klick: die nächste Stufe; Rechtsklick: Stufe wählen oder eine Notiz schreiben.',
    oraChiusa: 'Die Stunde ist abgeschlossen: Das Raster dieser Stunde lässt sich ansehen, nicht ändern.',
    giudiziAiuto: 'Datierte Notizen zu einer Person oder zur ganzen Klasse.',
    nessunaLezione: 'Noch keine Aktivität eines Plans ist diesem Projekt zugewiesen.',
    svolto: (n) => `${n} % der Aktivitäten des Projekts durchgeführt.`,
    presenze: 'Anwesenheit in den Stunden des Projekts',
    presenzeAiuto: 'Nach den Regeln der Absenzenkontrolle, nur in den Stunden mit Aktivitäten des Projekts.',
    udPerse: 'Verpasste Lektionen',
    ritardi: 'Verspätungen',
    fasi: 'Phasen',
    fasiAiuto:
      'Jede Phase sammelt die Aktivitäten der Pläne, die du ihr zuweist: Zeitraum und ' +
      'Fortschritt kommen aus den Stunden und ihrem Rückblick.',
    faseSenzaOre: 'keine Stunde',
    faseVuota: 'Keine Aktivität eines Plans ist in dieser Phase.',
    parti: 'Teile des Projekts',
    esiti: 'Ergebnisse',
    esitiAiuto: 'Einschätzungen, Beurteilungen und Anwesenheit im Projekt',
    statiAttivita: { 'da-fare': 'offen', svolta: 'durchgeführt', parziale: 'teilweise', saltata: 'ausgelassen' },
    valutazioniDelProgetto: 'Beurteilungen des Projekts',
    valutazioniAiuto:
      'Eine Prüfung entsteht aus der Aktivität des Plans, die sie ankündigt: Gehört die Aktivität ' +
      'zum Projekt, gehört auch die Prüfung dazu. Hier lassen sich auch frühere verbinden.',
    collegaValutazione: 'Beurteilung verbinden…',
    nessunMomentoLibero: 'Keine Beurteilung des Kurses zum Verbinden',
    nessunaValutazione: 'Keine Beurteilung verbunden.',
    staccaValutazione: (titolo) => `«${titolo}» vom Projekt lösen`,
    nessunCorso: 'Kein Kurs',
    progettiInUnCorso: 'Projekte gehören zu einem Kurs: Erstelle einen auf der Seite Kurse.',
    vaiAiCorsi: 'Zu den Kursen',
    aiuto:
      'Ein Projekt sammelt Aufgaben mit Beginn pro Person, Kriterien mit Stufen, ' +
      'Einschätzungen und die Stunden, in denen daran gearbeitet wird.',
    nessunProgetto: 'Kein Projekt',
    nessunProgettoTesto: 'Erstelle das erste Projekt des Kurses: Titel, Ziele, Aufgaben und Kriterien.',
  },
  fr: {
    nuovo: 'Nouveau projet',
    nessunoNelCorso: 'Ce cours n’a pas encore de projets.',
    avanzamentoDi: (titolo) => `Tâches finies dans « ${titolo} »`,
    documentiDelProgetto: 'Documents du projet',
    obiettivi: 'Objectifs',
    collegamenti: 'Liens',
    testataVuota: 'Ni description ni objectifs : ajoute-les avec « Modifier ».',
    criteriELivelli: 'Critères et niveaux',
    criteriAiuto:
      'Les critères sont les lignes de la grille ; les niveaux sont l’échelle avec ' +
      'laquelle on juge chacun, du bas.',
    livelli: 'Niveaux',
    nessunCriterio: 'Aucun critère pour l’instant.',
    compitiAiuto:
      'Une tâche vaut pour tous, avec une fin commune ; chacun la commence quand vient ' +
      'son tour et peut avoir une prolongation. Clic sur le début : commence aujourd’hui ; ' +
      'sur la fin : prolongation.',
    delGiorno: 'Du jour',
    progressione: 'Progression',
    comeGuardare: 'Comment voir la grille',
    nessunaOra: 'Aucune période',
    inUnOra: 'Dans une période du projet',
    matrice: 'Grille',
    matriceAiuto:
      'Chaque jour a ses cases : des cases à des jours différents racontent la progression. ' +
      'Clic : le niveau suivant ; clic droit : choisir le niveau ou écrire une note.',
    oraChiusa: 'La période est terminée : la grille de cette période se regarde et ne se change pas.',
    giudiziAiuto: 'Des notes datées sur une personne ou sur toute la classe.',
    nessunaLezione: 'Aucune activité d’un plan n’est encore attribuée à ce projet.',
    svolto: (n) => `${n} % des activités du projet réalisées.`,
    presenze: 'Présences dans les périodes du projet',
    presenzeAiuto: 'Avec les règles de l’appel, seulement sur les périodes avec des activités du projet.',
    udPerse: 'Périodes manquées',
    ritardi: 'Retards',
    fasi: 'Phases',
    fasiAiuto:
      'Chaque phase réunit les activités des plans que tu lui attribues : période et ' +
      'avancement viennent des périodes et de leur bilan.',
    faseSenzaOre: 'aucune période',
    faseVuota: 'Aucune activité d’un plan n’est dans cette phase.',
    parti: 'Parties du projet',
    esiti: 'Résultats',
    esitiAiuto: 'Appréciations, évaluations et présences du projet',
    statiAttivita: { 'da-fare': 'à faire', svolta: 'faite', parziale: 'en partie', saltata: 'sautée' },
    valutazioniDelProgetto: 'Évaluations du projet',
    valutazioniAiuto:
      'Une épreuve naît de l’activité du plan qui l’annonce : si l’activité est du projet, ' +
      'l’épreuve l’est aussi. Ici on relie aussi celles nées avant.',
    collegaValutazione: 'Relier une évaluation…',
    nessunMomentoLibero: 'Aucune évaluation du cours à relier',
    nessunaValutazione: 'Aucune évaluation reliée.',
    staccaValutazione: (titolo) => `Détacher « ${titolo} » du projet`,
    nessunCorso: 'Aucun cours',
    progettiInUnCorso: 'Les projets sont dans un cours : crée-en un dans la page Cours.',
    vaiAiCorsi: 'Aller aux cours',
    aiuto:
      'Un projet réunit des tâches avec un début par personne, des critères à niveaux, ' +
      'des appréciations et les périodes où l’on y travaille.',
    nessunProgetto: 'Aucun projet',
    nessunProgettoTesto: 'Crée le premier projet du cours : titre, objectifs, tâches et critères.',
  },
  en: {
    nuovo: 'New project',
    nessunoNelCorso: 'This course has no projects yet.',
    avanzamentoDi: (titolo) => `Tasks finished in “${titolo}”`,
    documentiDelProgetto: 'Project documents',
    obiettivi: 'Objectives',
    collegamenti: 'Links',
    testataVuota: 'No description or objectives: add them with “Edit”.',
    criteriELivelli: 'Criteria and levels',
    criteriAiuto:
      'The criteria are the rows of the grid; the levels are the scale used to judge ' +
      'each one, from the bottom.',
    livelli: 'Levels',
    nessunCriterio: 'No criteria yet.',
    compitiAiuto:
      'A task applies to everyone, with a common end; each learner starts it when their ' +
      'turn comes and can have an extension. Click the start: starts today; the end: extension.',
    delGiorno: 'Of the day',
    progressione: 'Progress',
    comeGuardare: 'How to view the grid',
    nessunaOra: 'No lesson',
    inUnOra: 'In a lesson of the project',
    matrice: 'Grid',
    matriceAiuto:
      'Each day has its own cells: cells on different days tell the progress. Click: the ' +
      'next level; right-click: choose the level or write a note.',
    oraChiusa: 'The lesson is finished: its grid can be viewed, not changed.',
    giudiziAiuto: 'Dated notes on one person or on the whole class.',
    nessunaLezione: 'No plan activity is assigned to this project yet.',
    svolto: (n) => `${n}% of the project’s activities done.`,
    presenze: 'Attendance in the project’s lessons',
    presenzeAiuto: 'With the register’s rules, only on lessons with activities of the project.',
    udPerse: 'Periods missed',
    ritardi: 'Late arrivals',
    fasi: 'Phases',
    fasiAiuto:
      'Each phase gathers the plan activities you assign to it: period and progress come ' +
      'from the lessons and their review.',
    faseSenzaOre: 'no lessons',
    faseVuota: 'No plan activity is in this phase.',
    parti: 'Parts of the project',
    esiti: 'Results',
    esitiAiuto: 'Comments, assessments and attendance of the project',
    statiAttivita: { 'da-fare': 'to do', svolta: 'done', parziale: 'partly', saltata: 'skipped' },
    valutazioniDelProgetto: 'Assessments of the project',
    valutazioniAiuto:
      'A test comes from the plan activity that declares it: if the activity belongs to the ' +
      'project, so does the test. Earlier ones can be linked here too.',
    collegaValutazione: 'Link an assessment…',
    nessunMomentoLibero: 'No course assessment to link',
    nessunaValutazione: 'No assessment linked.',
    staccaValutazione: (titolo) => `Unlink “${titolo}” from the project`,
    nessunCorso: 'No course',
    progettiInUnCorso: 'Projects belong to a course: create one on the Courses page.',
    vaiAiCorsi: 'Go to courses',
    aiuto:
      'A project gathers tasks with a start per learner, criteria with levels, comments ' +
      'and the lessons in which it is worked on.',
    nessunProgetto: 'No project',
    nessunProgettoTesto: 'Create the course’s first project: title, objectives, tasks and criteria.',
  },
})

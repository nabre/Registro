// I testi della pagina delle pendenze (`todo.ts`).

import { catalogo } from '../../../core/i18n/index.js'
import { plurale } from '../../../core/dominio/text.js'

const it = {
  titoloSelettore: 'Selettore categoria pendenze',
  titoloSottoSelettore: 'Selettore corso o classe delle pendenze',
  corsi: 'Corsi d’insegnamento',
  corsiAiuto: 'Pendenze legate all’insegnamento: verifiche, valutazioni e consegne',
  docenteDiClasse: 'Docenza di classe',
  docenteDiClasseAiuto: 'Adempimenti del docente di classe: firme assenze, segnalazioni e pratiche',
  tutteAiuto: 'Tutte le pendenze dell’anno per corsi e classi',
  tuttiICorsi: 'Tutti i corsi',
  tutteLeClassi: 'Tutte le classi',
  sezioneCorsi: 'Corsi d’insegnamento',
  sezioneDocenteClasse: 'Docenza di classe',
  docenteDiClasseEtichetta: (classe: string) => `${classe} · Docente di classe`,
  inRitardo: (quante: number) => `${quante} in ritardo`,
  senzaAnno:
    'Le consegne appartengono a un corso: prima serve sapere che cosa si insegna e a chi.',

  // Quando non c'è niente.
  vuotoTitolo: 'Niente in sospeso',
  vuotoTesto:
    'Qui compare quel che resta aperto nel corso scelto: valutazioni, documenti da ' +
    'consegnare e attività assegnate alla classe o al docente.',
  vuotoTestoTutte:
    'Tutte le consegne, valutazioni e verifiche sono in pari: nessun lavoro aperto.',
  vuotoTestoCorsi: 'Tutte le verifiche e le consegne dei corsi sono in pari: nessun lavoro aperto.',
  vuotoTestoDocenteClasse: 'Nessun adempimento aperto per le classi di cui si è docente di classe.',
  nessunCorsoConLavoro: 'Nessuna pendenza aperta nei corsi d’insegnamento.',
  nessunaClasseConLavoro: 'Nessuna pendenza aperta nella docenza di classe.',
  nessunaPendenzaTesto: 'Non ci sono pendenze aperte in questo contesto.',
  assegnaPrima: 'Assegna la prima',

  // La scheda delle cose chiuse.
  coseAperte: (quante: number) => plurale(quante, 'pendenza aperta', 'pendenze aperte'),
  fatto: 'Fatto',
  coseChiuse: (quante: number) => plurale(quante, 'cosa chiusa', 'cose chiuse'),
  fattoAiuto: 'quel che non chiede più niente',
  mostraChiuso: 'Mostra quel che è stato chiuso',
  recuperiChiusi: 'Recuperi chiusi',
  proveRiconsegnate: 'Prove riconsegnate',
  consegneFatte: 'Consegne fatte',
}

export const testi = catalogo(it, {
  de: {
    titoloSelettore: 'Kategorieauswahl für Pendenzen',
    titoloSottoSelettore: 'Kurs- oder Klassenauswahl für Pendenzen',
    corsi: 'Unterrichtskurse',
    corsiAiuto: 'Pendenzen aus dem Unterricht: Prüfungen, Beurteilungen und Aufträge',
    docenteDiClasse: 'Klassenlehrperson',
    docenteDiClasseAiuto: 'Aufgaben der Klassenlehrperson: Unterschriften Absenzen, Meldungen und Unterlagen',
    tutteAiuto: 'Alle Pendenzen des Jahres nach Kursen und Klassen',
    tuttiICorsi: 'Alle Kurse',
    tutteLeClassi: 'Alle Klassen',
    sezioneCorsi: 'Unterrichtskurse',
    sezioneDocenteClasse: 'Klassenlehrperson',
    docenteDiClasseEtichetta: (classe) => `${classe} · Klassenlehrperson`,
    inRitardo: (quante) => `${quante} überfällig`,
    senzaAnno: 'Aufträge gehören zu einem Kurs: Zuerst muss klar sein, was du unterrichtest ' +
      'und wem.',
    vuotoTitolo: 'Nichts offen',
    vuotoTesto:
      'Hier erscheint, was im gewählten Kurs offen ist: Beurteilungen, auszuhändigende ' +
      'Dokumente und Aufgaben für die Klasse oder die Lehrperson.',
    vuotoTestoTutte:
      'Alle Aufträge, Beurteilungen und Prüfungen sind erledigt: keine offenen Arbeiten.',
    vuotoTestoCorsi: 'Alle Prüfungen und Aufträge der Kurse sind erledigt: keine offenen Arbeiten.',
    vuotoTestoDocenteClasse: 'Keine offenen Aufgaben für die Klassen mit Funktion als Klassenlehrperson.',
    nessunCorsoConLavoro: 'Keine offenen Pendenzen in den Unterrichtskursen.',
    nessunaClasseConLavoro: 'Keine offenen Pendenzen bei den Aufgaben als Klassenlehrperson.',
    nessunaPendenzaTesto: 'In diesem Kontext gibt es keine offenen Pendenzen.',
    assegnaPrima: 'Ersten Auftrag erteilen',
    coseAperte: (quante) => plurale(quante, 'offene Pendenz', 'offene Pendenzen'),
    fatto: 'Erledigt',
    coseChiuse: (quante) => plurale(quante, 'erledigte Sache', 'erledigte Sachen'),
    fattoAiuto: 'was nichts mehr verlangt',
    mostraChiuso: 'Erledigtes anzeigen',
    recuperiChiusi: 'Abgeschlossene Nachprüfungen',
    proveRiconsegnate: 'Zurückgegebene Prüfungen',
    consegneFatte: 'Erledigte Aufträge',
  },
  fr: {
    titoloSelettore: 'Sélecteur de catégorie des tâches en suspens',
    titoloSottoSelettore: 'Sélecteur de cours ou de classe des tâches en suspens',
    corsi: 'Cours d’enseignement',
    corsiAiuto: 'Tâches liées à l’enseignement : contrôles, évaluations et devoirs',
    docenteDiClasse: 'Maître de classe',
    docenteDiClasseAiuto: 'Devoirs du maître de classe : signatures d’absences, signalements et dossiers',
    tutteAiuto: 'Toutes les tâches en suspens de l’année par cours et classes',
    tuttiICorsi: 'Tous les cours',
    tutteLeClassi: 'Toutes les classes',
    sezioneCorsi: 'Cours d’enseignement',
    sezioneDocenteClasse: 'Maître de classe',
    docenteDiClasseEtichetta: (classe) => `${classe} · Maître de classe`,
    inRitardo: (quante) => `${quante} en retard`,
    senzaAnno: 'Les devoirs appartiennent à un cours : il faut d’abord savoir ce qu’on ' +
      'enseigne, et à qui.',
    vuotoTitolo: 'Rien en suspens',
    vuotoTesto:
      'Ici apparaît ce qui reste ouvert dans le cours choisi : évaluations, documents à ' +
      'remettre et activités attribuées à la classe ou à l’enseignant.',
    vuotoTestoTutte:
      'Tous les devoirs, évaluations et contrôles sont à jour : aucun travail en cours.',
    vuotoTestoCorsi: 'Tous les contrôles et devoirs des cours sont à jour : aucun travail en cours.',
    vuotoTestoDocenteClasse: 'Aucun travail en attente pour les classes de maître de classe.',
    nessunCorsoConLavoro: 'Aucune tâche en suspens dans les cours d’enseignement.',
    nessunaClasseConLavoro: 'Aucune tâche en suspens pour le maître de classe.',
    nessunaPendenzaTesto: 'Il n’y a aucune tâche en suspens dans ce contexte.',
    assegnaPrima: 'Donner le premier devoir',
    coseAperte: (quante) => plurale(quante, 'tâche en suspens', 'tâches en suspens'),
    fatto: 'Terminé',
    coseChiuse: (quante) => plurale(quante, 'élément clos', 'éléments clos'),
    fattoAiuto: 'ce qui ne demande plus rien',
    mostraChiuso: 'Afficher ce qui a été clos',
    recuperiChiusi: 'Rattrapages clos',
    proveRiconsegnate: 'Épreuves rendues',
    consegneFatte: 'Devoirs faits',
  },
  en: {
    titoloSelettore: 'Pending items category selector',
    titoloSottoSelettore: 'Course or class selector for pending items',
    corsi: 'Teaching courses',
    corsiAiuto: 'Pending teaching tasks: tests, assessments, and assignments',
    docenteDiClasse: 'Class teacher',
    docenteDiClasseAiuto: 'Class teacher duties: absence signatures, alerts, and forms',
    tutteAiuto: 'All pending items of the year by courses and classes',
    tuttiICorsi: 'All courses',
    tutteLeClassi: 'All classes',
    sezioneCorsi: 'Teaching courses',
    sezioneDocenteClasse: 'Class teacher duties',
    docenteDiClasseEtichetta: (classe) => `${classe} · Class teacher`,
    inRitardo: (quante) => `${quante} overdue`,
    senzaAnno: 'Assignments belong to a course: first the register needs to know what you ' +
      'teach, and to whom.',
    vuotoTitolo: 'Nothing pending',
    vuotoTesto:
      'This page shows what remains open in the selected course: assessments, documents ' +
      'to hand over, and activities assigned to the class or the teacher.',
    vuotoTestoTutte:
      'All assignments, assessments, and tests are up to date: nothing open.',
    vuotoTestoCorsi: 'All tests and course assignments are up to date: nothing open.',
    vuotoTestoDocenteClasse: 'No open duties for class teacher classes.',
    nessunCorsoConLavoro: 'No open pending items in teaching courses.',
    nessunaClasseConLavoro: 'No open pending items in class teacher duties.',
    nessunaPendenzaTesto: 'There are no open pending items in this context.',
    assegnaPrima: 'Set the first assignment',
    coseAperte: (quante) => plurale(quante, 'pending item', 'pending items'),
    fatto: 'Done',
    coseChiuse: (quante) => plurale(quante, 'closed item', 'closed items'),
    fattoAiuto: 'nothing more to do here',
    mostraChiuso: 'Show what has been closed',
    recuperiChiusi: 'Closed resits',
    proveRiconsegnate: 'Tests handed back',
    consegneFatte: 'Completed assignments',
  },
})

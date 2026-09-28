// I testi delle porzioni di pagina (`tabs.ts`): linguette, modi del calendario,
// schede dei documenti, filtri delle pendenze. Li dicono anche il percorso e
// l'assistente.

import { catalogo } from '../../core/i18n/index.js'
import { LEZIONE, Molti, PERSONE, PIF, SCUOLA, Uno } from '../../core/dominio/lexicon.js'
import { lessico } from '../../core/dominio/lexicon.testi.js'

const it = {
  // Le linguette del registro dell'ora.
  amministrazione: 'Amministrazione',
  lezione: 'Lezione',
  annotazioni: 'Annotazioni',

  // Le linguette della scheda di una persona.
  anagrafica: 'Anagrafica',
  docenteClasse: Uno(PERSONE.docenteClasse),
  materie: Molti(SCUOLA.materia),

  // I modi del calendario.
  settimanaAiuto: 'Le lezioni sulla griglia dei giorni, alte quanto durano',
  meseAiuto: 'Una striscia di settimane che scorre senza fine',
  anno: 'Anno',
  annoAiuto:
    'L’anno intero in un foglio: vacanze, semestri e quanti corsi per giorno',
  agenda: 'Agenda',
  agendaAiuto: 'Le lezioni in elenco, una riga ciascuna',

  // Le schede dei documenti.
  corso: Uno(SCUOLA.corso),
  schedaCorso: 'Scheda corso',
  corsoAiuto:
    'Presenze, valutazioni, diario, piani lezione, pendenze e check del corso',
  classe: Uno(PERSONE.docenteClasse),
  classeAiuto:
    'Assenze e gestione, documenti, pendenze e check del docente di classe',
  lezioni: Molti(LEZIONE.lezione),
  lezioniAiuto:
    'Un riquadro per ogni lezione: verbale, piano e prove di quel giorno',
  allievi: Uno(PIF),
  allieviAiuto: `Dettaglio per il corso e docente di classe per ogni ${PIF.singolare}`,
  docente: 'Docente',
  docenteAiuto: 'I fogli miei come docente: le supplenze tenute in questo corso',

  // I filtri delle pendenze.
  tutteAiuto: 'Quel che tocca a me e quel che tocca alle classi, insieme',
  mie: 'Le mie',

  /** La linguetta della mappa con tutti i punti. */
}

export const testi = catalogo(it, {
  de: {
    amministrazione: 'Verwaltung',
    lezione: 'Unterricht',
    annotazioni: 'Notizen',
    anagrafica: 'Personalien',
    docenteClasse: Uno(lessico.in('de').docenteClasse),
    materie: Molti(lessico.in('de').materia),
    settimanaAiuto: 'Die Stunden im Raster der Tage, so hoch, wie sie dauern',
    meseAiuto: 'Ein Band von Wochen, das endlos weiterläuft',
    anno: 'Jahr',
    annoAiuto:
      'Das ganze Jahr auf einem Blatt: Ferien, Semester und wie viele Kurse pro Tag',
    agenda: 'Agenda',
    agendaAiuto: 'Die Stunden als Liste, eine Zeile pro Stunde',
    corso: Uno(lessico.in('de').corso),
    schedaCorso: 'Kursblatt',
    corsoAiuto:
      'Präsenzen, Beurteilungen, Kurstagebuch, Unterrichtspläne, Pendenzen und Kontrollen des Kurses',
    classe: Uno(lessico.in('de').docenteClasse),
    classeAiuto:
      'Absenzen und Verwaltung, Dokumente, Pendenzen und Kontrollen der Klassenlehrperson',
    lezioni: Molti(lessico.in('de').lezione),
    lezioniAiuto:
      'Ein Feld pro Stunde: ihr Protokoll, ihr Plan, die Prüfungen jenes Tages',
    allievi: Uno(lessico.in('de').pif),
    allieviAiuto: 'Detail für den Kurs und Klassenlehrperson pro lernende Person',
    docente: 'Lehrperson',
    docenteAiuto: 'Meine Blätter als Lehrperson: die Stellvertretungen in diesem Kurs',
    tutteAiuto: 'Was mich betrifft und was die Klassen betrifft, zusammen',
    mie: 'Meine',
  },
  fr: {
    amministrazione: 'Administration',
    lezione: 'Leçon',
    annotazioni: 'Annotations',
    anagrafica: 'Données personnelles',
    docenteClasse: Uno(lessico.in('fr').docenteClasse),
    materie: Molti(lessico.in('fr').materia),
    settimanaAiuto:
      'Les leçons sur la grille des jours, aussi hautes qu’elles sont longues',
    meseAiuto: 'Une bande de semaines qui défile sans fin',
    anno: 'Année',
    annoAiuto:
      'L’année entière sur une feuille : vacances, semestres et combien de cours par jour',
    agenda: 'Agenda',
    agendaAiuto: 'Les leçons en liste, une ligne chacune',
    corso: Uno(lessico.in('fr').corso),
    schedaCorso: 'Fiche du cours',
    corsoAiuto:
      'Présences, évaluations, journal, plans de leçon, tâches et contrôles du cours',
    classe: Uno(lessico.in('fr').docenteClasse),
    classeAiuto:
      'Absences et gestion, documents, tâches et contrôles du maître de classe',
    lezioni: Molti(lessico.in('fr').lezione),
    lezioniAiuto:
      'Un cadre par leçon : son procès-verbal, son plan, les épreuves de ce jour-là',
    allievi: Uno(lessico.in('fr').pif),
    allieviAiuto:
      'Détail pour le cours et le maître de classe pour chaque personne en formation',
    docente: 'Enseignant',
    docenteAiuto: 'Mes feuilles d’enseignant : les remplacements donnés dans ce cours',
    tutteAiuto: 'Ce qui me revient et ce qui revient aux classes, ensemble',
    mie: 'Les miennes',
  },
  en: {
    amministrazione: 'Admin',
    lezione: 'Lesson',
    annotazioni: 'Notes',
    anagrafica: 'Personal details',
    docenteClasse: Uno(lessico.in('en').docenteClasse),
    materie: Molti(lessico.in('en').materia),
    settimanaAiuto: 'The lessons on the grid of days, as tall as they are long',
    meseAiuto: 'A strip of weeks that scrolls without end',
    anno: 'Year',
    annoAiuto:
      'The whole year on one sheet: holidays, semesters and how many courses per day',
    agenda: 'Agenda',
    agendaAiuto: 'The lessons as a list, one row each',
    corso: Uno(lessico.in('en').corso),
    schedaCorso: 'Course sheet',
    corsoAiuto:
      'Attendance, assessments, journal, lesson plans, pendencies and checks for the course',
    classe: Uno(lessico.in('en').docenteClasse),
    classeAiuto:
      'Absences and tracking, documents, pendencies and checks for the class teacher',
    lezioni: Molti(lessico.in('en').lezione),
    lezioniAiuto:
      'One box per lesson: its lesson record, its plan, that day’s tests',
    allievi: Uno(lessico.in('en').pif),
    allieviAiuto: 'Detail for course and class teacher for each learner',
    docente: 'Teacher',
    docenteAiuto: 'My sheets as a teacher: the substitutions taught in this course',
    tutteAiuto: 'What is mine to do and what is the classes’, together',
    mie: 'Mine',
  },
})

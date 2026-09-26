// I testi delle porzioni di pagina (`tabs.ts`): linguette, modi del calendario,
// schede dei documenti, filtri delle pendenze. Li dicono anche il percorso e
// l'assistente.

import { catalogo } from '../i18n/index.js'
import { Molti, PERSONE, PIF, SCUOLA, Uno } from '../domain/lexicon.js'
import { lessico } from '../domain/lexicon.testi.js'

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
  settimanaAiuto: 'Le ore sulla griglia dei giorni, alte quanto durano',
  meseAiuto: 'Una striscia di settimane che scorre senza fine',
  anno: 'Anno',
  annoAiuto: 'L’anno intero in un foglio: vacanze, semestri e quanti corsi per giorno',
  agenda: 'Agenda',
  agendaAiuto: 'Le ore in elenco, una riga ciascuna',

  // Le schede dei documenti.
  corso: 'Corso',
  corsoAiuto: 'Presenze, valutazioni, verbali, prove, piani, fascicolo: i fogli di tutta la classe',
  lezioni: 'Lezioni',
  lezioniAiuto: 'Un riquadro per ogni ora: il suo verbale, il suo piano, le prove di quel giorno',
  allievi: Molti(PIF),
  allieviAiuto: `Una scheda per ogni ${PIF.singolare}: profitto, presenze, annotazioni`,

  // I filtri delle pendenze.
  tutteAiuto: 'Quel che tocca a me e quel che tocca alle classi, insieme',
  mie: 'Le mie',
  mieAiuto: 'Solo quel che devo fare io: la lista della sera prima',
  delleClassi: 'Delle classi',
  delleClassiAiuto: 'Solo quel che devono portare loro: la lista che si legge entrando in aula',

  // I filtri delle pendenze di una classe.
  tutteLeConsegne: 'Tutte le consegne',
  tutteLeConsegneAiuto: 'Quel che tocca a me e quel che tocca alla classe, insieme',
  consegnePersonali: 'Consegne personali',
  consegnePersonaliAiuto: 'Solo quel che devo fare io in questa classe: la lista della sera prima',

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
    annoAiuto: 'Das ganze Jahr auf einem Blatt: Ferien, Semester und wie viele Kurse pro Tag',
    agenda: 'Agenda',
    agendaAiuto: 'Die Stunden als Liste, eine Zeile pro Stunde',
    corso: 'Kurs',
    corsoAiuto:
      'Präsenzen, Beurteilungen, Protokolle, Prüfungen, Pläne, Dossier: die Blätter der ganzen ' +
      'Klasse',
    lezioni: 'Stunden',
    lezioniAiuto: 'Ein Feld pro Stunde: ihr Protokoll, ihr Plan, die Prüfungen jenes Tages',
    allievi: Molti(lessico.in('de').pif),
    allieviAiuto: 'Ein Blatt pro lernende Person: Leistung, Präsenzen, Notizen',
    tutteAiuto: 'Was mich betrifft und was die Klassen betrifft, zusammen',
    mie: 'Meine',
    mieAiuto: 'Nur was ich selbst tun muss: die Liste für den Vorabend',
    delleClassi: 'Der Klassen',
    delleClassiAiuto:
      'Nur was sie mitbringen müssen: die Liste, die man beim Betreten des Schulzimmers liest',
    tutteLeConsegne: 'Alle Aufträge',
    tutteLeConsegneAiuto: 'Was mich betrifft und was die Klasse betrifft, zusammen',
    consegnePersonali: 'Persönliche Aufträge',
    consegnePersonaliAiuto:
      'Nur was ich selbst in dieser Klasse tun muss: die Liste für den Vorabend',
  },
  fr: {
    amministrazione: 'Administration',
    lezione: 'Leçon',
    annotazioni: 'Annotations',
    anagrafica: 'Données personnelles',
    docenteClasse: Uno(lessico.in('fr').docenteClasse),
    materie: Molti(lessico.in('fr').materia),
    settimanaAiuto: 'Les leçons sur la grille des jours, aussi hautes qu’elles sont longues',
    meseAiuto: 'Une bande de semaines qui défile sans fin',
    anno: 'Année',
    annoAiuto:
      'L’année entière sur une feuille : vacances, semestres et combien de cours par jour',
    agenda: 'Agenda',
    agendaAiuto: 'Les leçons en liste, une ligne chacune',
    corso: 'Cours',
    corsoAiuto:
      'Présences, évaluations, procès-verbaux, épreuves, plans, dossier : les feuilles de toute ' +
      'la classe',
    lezioni: 'Leçons',
    lezioniAiuto: 'Un cadre par leçon : son procès-verbal, son plan, les épreuves de ce jour-là',
    allievi: Molti(lessico.in('fr').pif),
    allieviAiuto: 'Une fiche par personne en formation : résultats, présences, annotations',
    tutteAiuto: 'Ce qui me revient et ce qui revient aux classes, ensemble',
    mie: 'Les miennes',
    mieAiuto: 'Seulement ce que je dois faire moi : la liste de la veille',
    delleClassi: 'Des classes',
    delleClassiAiuto:
      'Seulement ce qu’elles doivent apporter : la liste qu’on lit en entrant en classe',
    tutteLeConsegne: 'Tous les devoirs',
    tutteLeConsegneAiuto: 'Ce qui me revient et ce qui revient à la classe, ensemble',
    consegnePersonali: 'Devoirs personnels',
    consegnePersonaliAiuto:
      'Seulement ce que je dois faire moi dans cette classe : la liste de la veille',
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
    annoAiuto: 'The whole year on one sheet: holidays, semesters and how many courses per day',
    agenda: 'Agenda',
    agendaAiuto: 'The lessons as a list, one row each',
    corso: 'Course',
    corsoAiuto:
      'Attendance, assessments, lesson records, tests, plans, class file: the sheets for the whole class',
    lezioni: 'Lessons',
    lezioniAiuto: 'One box per lesson: its lesson record, its plan, that day’s tests',
    allievi: Molti(lessico.in('en').pif),
    allieviAiuto: 'One sheet per learner: progress, attendance, notes',
    tutteAiuto: 'What is mine to do and what is the classes’, together',
    mie: 'Mine',
    mieAiuto: 'Only what I have to do: the list for the evening before',
    delleClassi: 'The classes’',
    delleClassiAiuto: 'Only what they have to bring: the list you read on entering the room',
    tutteLeConsegne: 'All assignments',
    tutteLeConsegneAiuto: 'What is mine to do and what is the class’s, together',
    consegnePersonali: 'Personal assignments',
    consegnePersonaliAiuto: 'Only what I have to do in this class: the list for the evening before',
  },
})

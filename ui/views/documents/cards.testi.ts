// I testi dei riquadri della pagina Documenti (`cards.ts`).
// I nomi dei fogli («il conto delle presenze», «la scheda di …») entrano nelle
// frasi di `sheets.ts`: si scrivono con il loro articolo.

import { catalogo } from '#core/i18n/index.js'
import { PIF, Molti, Uno, quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  // Del corso
  delCorso: 'Del corso',
  schedaCorso: 'Scheda del corso',
  nomeSchedaCorso: 'la scheda completa del corso',
  schedaDocenteClasse: 'Docente di classe',
  tuttaLaClasse: (periodo: string) => `Di tutta la classe insieme · ${periodo}`,
  presenze: 'Presenze',
  nomePresenze: 'il conto delle presenze',
  valutazioni: 'Valutazioni',
  nomeValutazioni: 'la griglia dei voti',
  presenzeCsv: 'Presenze in CSV',
  nomePresenzeCsv: 'le presenze per il foglio di calcolo',
  valutazioniCsv: 'Valutazioni in CSV',
  nomeValutazioniCsv: 'i voti per il foglio di calcolo',
  diario: 'Diario',
  nomeDiario: 'il diario cumulativo delle lezioni',
  nomeProgetto: (titolo: string) => `il rapporto del progetto «${titolo}»`,
  tuttoIlProgetto: 'Di tutta la classe insieme · tutto il progetto',
  rapportoDiClasse: 'Rapporto di classe',
  individualiPronti: (pronti: number, tutti: number) =>
    `Rapporti individuali: ${pronti} di ${tutti} nella cartella`,
  vediIndividuali: `Vedi in «${Uno(PIF)}»`,
  progettoDi: (nome: string, titolo: string) => `il rapporto di ${nome} nel progetto «${titolo}»`,

  // Le prove e i piani
  nessunaProva: 'Nessuna prova nel periodo scelto.',
  nessunVoto: 'nessun voto',
  schedaDiProva: (titolo: string) => `la scheda di «${titolo}»`,
  pianiConto: (quanti: number) =>
    `${plurale(quanti, 'piano', 'piani')} · di questo corso`,
  nessunPiano: 'Questo corso non ha piani lezione.',

  // Della classe
  dellaClasse: 'Della classe',
  dellaClasseAiuto: 'vale per tutte le materie, e per l’anno intero',
  fascicoloContiene: `${Molti(PIF)}, documenti e periodi di assenze`,
  nomeFascicolo: 'il fascicolo della classe',

  // Le lezioni
  ore: (quante: number) => plurale(quante, 'lezione', 'lezioni'),
  nessunaOra: 'Nessuna lezione nel periodo scelto.',
  numero: 'N.',
  verbale: 'Verbale',
  annullata: 'La lezione è annullata: non c’è niente da verbalizzare.',
  nonConclusa:
    'La lezione non è ancora conclusa: il verbale uscirebbe senza appello e senza consuntivo.',
  nomeVerbale: (giorno: string) => `il verbale del ${giorno}`,
  verbaleInTesto: 'Lo stesso verbale in testo, da correggere',
  nessunPianoCella: 'nessun piano',

  // Le persone
  foto: 'Foto della classe',
  fotoAiuto: `Una faccia e un nome per ${PIF.singolare}: il foglio da portare in aula`,
  nomeFoto: 'il foglio delle facce',
  schedeConto: (persone: number, periodo: string) =>
    `${quanti(persone, PIF)} · una ciascuna · ${periodo}`,
  nessunaPersona: `La classe non ha ${PIF.plurale} attive.`,

  // Del docente
  supplenze: 'Supplenze',
  supplenzeAiuto:
    'le ore tenute al posto di un altro docente: la scheda del corso con quelle sole',
  oreDiSupplenza: (quante: number, periodo: string) =>
    `${plurale(quante, 'ora svolta', 'ore svolte')} · ${periodo}`,
  nessunaSupplenza:
    'Nessuna supplenza svolta nel periodo scelto. Un’ora si segna come supplenza ' +
    'modificandola dal calendario.',
  schedaSupplenze: 'Scheda delle supplenze',
  nomeSchedaSupplenze: 'la scheda delle supplenze',
  schedaDiPersona: (nome: string) => `la scheda di ${nome}`,
  dettaglioCorso: 'Corso',
  dettaglioDocenteClasse: 'Docente di classe',
  schedaDiPersonaCorso: (nome: string) => `la scheda del corso di ${nome}`,
  schedaDiPersonaClasse: (nome: string) => `la scheda del docente di classe per ${nome}`,
  // Le linguette dei documenti del corso e delle persone: «Corso» e una per progetto.
  linguette: 'Corso o progetto',
  progettoConto: (persone: number) =>
    `${quanti(persone, PIF)} · un rapporto ciascuna · tutto il progetto`,
}

export const testi = catalogo(it, {
  de: {
    delCorso: 'Zum Kurs',
    schedaCorso: 'Kursblatt',
    nomeSchedaCorso: 'das vollständige Kursblatt',
    schedaDocenteClasse: 'Klassenlehrperson',
    tuttaLaClasse: (periodo) => `Für die ganze Klasse zusammen · ${periodo}`,
    presenze: 'Präsenzen',
    nomePresenze: 'die Präsenzübersicht',
    valutazioni: 'Beurteilungen',
    nomeValutazioni: 'die Notentabelle',
    presenzeCsv: 'Präsenzen als CSV',
    nomePresenzeCsv: 'die Präsenzen für die Tabellenkalkulation',
    valutazioniCsv: 'Beurteilungen als CSV',
    nomeValutazioniCsv: 'die Noten für die Tabellenkalkulation',
    diario: 'Kurstagebuch',
    nomeDiario: 'das kumulative Kurstagebuch',
    nomeProgetto: (titolo) => `den Bericht zum Projekt «${titolo}»`,
    tuttoIlProgetto: 'Für die ganze Klasse zusammen · ganzes Projekt',
    rapportoDiClasse: 'Klassenbericht',
    individualiPronti: (pronti, tutti) =>
      `Einzelberichte: ${pronti} von ${tutti} im Ordner`,
    vediIndividuali: `Unter «${Uno(lessico.in('de').pif)}» ansehen`,
    progettoDi: (nome, titolo) => `den Bericht von ${nome} im Projekt «${titolo}»`,

    nessunaProva: 'Keine Prüfung im gewählten Zeitraum.',
    nessunVoto: 'keine Noten',
    schedaDiProva: (titolo) => `das Blatt zu «${titolo}»`,
    pianiConto: (quanti) =>
      `${plurale(quanti, 'Plan', 'Pläne')} · dieses Kurses`,
    nessunPiano: 'Dieser Kurs hat keine Unterrichtspläne.',

    dellaClasse: 'Zur Klasse',
    dellaClasseAiuto: 'gilt für alle Fächer und für das ganze Schuljahr',
    fascicoloContiene: 'Lernende, Dokumente und Absenzenzeiträume',
    nomeFascicolo: 'das Klassendossier',

    ore: (quante) => plurale(quante, 'Stunde', 'Stunden'),
    nessunaOra: 'Keine Stunde im gewählten Zeitraum.',
    numero: 'Nr.',
    verbale: 'Protokoll',
    annullata: 'Die Stunde ist ausgefallen: Es gibt nichts zu protokollieren.',
    nonConclusa:
      'Die Stunde ist noch nicht abgeschlossen: Das Protokoll käme ohne Präsenzkontrolle und ' +
      'ohne Rückblick heraus.',
    nomeVerbale: (giorno) => `das Protokoll vom ${giorno}`,
    verbaleInTesto: 'Dasselbe Protokoll als Text, zum Korrigieren',
    nessunPianoCella: 'kein Plan',

    foto: 'Klassenfoto',
    fotoAiuto:
      'Ein Gesicht und ein Name pro lernende Person: das Blatt fürs Schulzimmer',
    nomeFoto: 'das Blatt mit den Gesichtern',
    schedeConto: (persone, periodo) =>
      `${persone} Lernende · eines pro Person · ${periodo}`,
    nessunaPersona: 'Die Klasse hat keine aktiven Lernenden.',
    supplenze: 'Stellvertretungen',
    supplenzeAiuto:
      'die Stunden an Stelle einer anderen Lehrperson: das Kursblatt nur mit diesen',
    oreDiSupplenza: (quante, periodo) =>
      `${quante} ${quante === 1 ? 'gehaltene Stunde' : 'gehaltene Stunden'} · ${periodo}`,
    nessunaSupplenza:
      'Keine gehaltene Stellvertretung im gewählten Zeitraum. Eine Stunde markiert man als ' +
      'Stellvertretung, indem man sie im Kalender bearbeitet.',
    schedaSupplenze: 'Blatt der Stellvertretungen',
    nomeSchedaSupplenze: 'das Blatt der Stellvertretungen',
    schedaDiPersona: (nome) => `das Blatt von ${nome}`,
    dettaglioCorso: 'Kurs',
    dettaglioDocenteClasse: 'Klassenlehrperson',
    schedaDiPersonaCorso: (nome) => `das Kursblatt von ${nome}`,
    schedaDiPersonaClasse: (nome) => `das Klassenlehrperson-Blatt für ${nome}`,
    linguette: 'Kurs oder Projekt',
    progettoConto: (persone) =>
      `${persone} Lernende · ein Bericht pro Person · das ganze Projekt`,
  },
  fr: {
    delCorso: 'Du cours',
    schedaCorso: 'Fiche du cours',
    nomeSchedaCorso: 'la fiche complète du cours',
    schedaDocenteClasse: 'Maître de classe',
    tuttaLaClasse: (periodo) => `De toute la classe ensemble · ${periodo}`,
    presenze: 'Présences',
    nomePresenze: 'le décompte des présences',
    valutazioni: 'Évaluations',
    nomeValutazioni: 'la grille des notes',
    presenzeCsv: 'Présences en CSV',
    nomePresenzeCsv: 'les présences pour le tableur',
    valutazioniCsv: 'Évaluations en CSV',
    nomeValutazioniCsv: 'les notes pour le tableur',
    diario: 'Journal',
    nomeDiario: 'le journal cumulatif des leçons',
    nomeProgetto: (titolo) => `le rapport du projet « ${titolo} »`,
    tuttoIlProgetto: 'Pour toute la classe ensemble · tout le projet',
    rapportoDiClasse: 'Rapport de classe',
    individualiPronti: (pronti, tutti) =>
      `Rapports individuels : ${pronti} sur ${tutti} dans le dossier`,
    vediIndividuali: `Voir dans « ${Uno(lessico.in('fr').pif)} »`,
    progettoDi: (nome, titolo) => `le rapport de ${nome} dans le projet « ${titolo} »`,

    nessunaProva: 'Aucune épreuve dans la période choisie.',
    nessunVoto: 'aucune note',
    schedaDiProva: (titolo) => `la fiche de « ${titolo} »`,
    pianiConto: (quanti) => `${plurale(quanti, 'plan', 'plans')} · de ce cours`,
    nessunPiano: 'Ce cours n’a pas de plans de leçon.',

    dellaClasse: 'De la classe',
    dellaClasseAiuto: 'vaut pour toutes les branches, et pour l’année entière',
    fascicoloContiene:
      'Personnes en formation, documents et périodes d’absences',
    nomeFascicolo: 'le dossier de classe',

    ore: (quante) => plurale(quante, 'leçon', 'leçons'),
    nessunaOra: 'Aucune leçon dans la période choisie.',
    numero: 'N°',
    verbale: 'Procès-verbal',
    annullata: 'La leçon est annulée : il n’y a rien à consigner.',
    nonConclusa:
      'La leçon n’est pas encore terminée : le procès-verbal sortirait sans appel et sans bilan.',
    nomeVerbale: (giorno) => `le procès-verbal du ${giorno}`,
    verbaleInTesto: 'Le même procès-verbal en texte, à corriger',
    nessunPianoCella: 'aucun plan',

    foto: 'Photos de la classe',
    fotoAiuto:
      'Un visage et un nom par personne en formation : la feuille à emporter en classe',
    nomeFoto: 'le trombinoscope',
    schedeConto: (persone, periodo) =>
      `${plurale(persone, 'personne en formation', 'personnes en formation')} · une chacune · ` +
      periodo,
    nessunaPersona: 'La classe n’a pas de personnes en formation actives.',
    supplenze: 'Remplacements',
    supplenzeAiuto:
      'les leçons données à la place d’un autre enseignant : la fiche du cours avec elles seules',
    oreDiSupplenza: (quante, periodo) =>
      `${plurale(quante, 'leçon donnée', 'leçons données')} · ${periodo}`,
    nessunaSupplenza:
      'Aucun remplacement donné dans la période choisie. Une leçon se marque comme ' +
      'remplacement en la modifiant depuis le calendrier.',
    schedaSupplenze: 'Fiche des remplacements',
    nomeSchedaSupplenze: 'la fiche des remplacements',
    schedaDiPersona: (nome) => `la fiche de ${nome}`,
    dettaglioCorso: 'Cours',
    dettaglioDocenteClasse: 'Maître de classe',
    schedaDiPersonaCorso: (nome) => `la fiche de cours de ${nome}`,
    schedaDiPersonaClasse: (nome) => `la fiche du maître de classe pour ${nome}`,
    linguette: 'Cours ou projet',
    progettoConto: (persone) =>
      `${plurale(persone, 'personne en formation', 'personnes en formation')} · un rapport ` +
      'chacune · tout le projet',
  },
  en: {
    delCorso: 'For the course',
    schedaCorso: 'Course sheet',
    nomeSchedaCorso: 'the full course sheet',
    schedaDocenteClasse: 'Class teacher',
    tuttaLaClasse: (periodo) => `The whole class together · ${periodo}`,
    presenze: 'Attendance',
    nomePresenze: 'the attendance count',
    valutazioni: 'Assessments',
    nomeValutazioni: 'the grade grid',
    presenzeCsv: 'Attendance as CSV',
    nomePresenzeCsv: 'the attendance for the spreadsheet',
    valutazioniCsv: 'Assessments as CSV',
    nomeValutazioniCsv: 'the grades for the spreadsheet',
    diario: 'Journal',
    nomeDiario: 'the cumulative lesson journal',
    nomeProgetto: (titolo) => `the report of the project “${titolo}”`,
    tuttoIlProgetto: 'For the whole class together · whole project',
    rapportoDiClasse: 'Class report',
    individualiPronti: (pronti, tutti) =>
      `Individual reports: ${pronti} of ${tutti} in the folder`,
    vediIndividuali: `See in “${Uno(lessico.in('en').pif)}”`,
    progettoDi: (nome, titolo) => `the report of ${nome} in the project “${titolo}”`,

    nessunaProva: 'No tests in the chosen period.',
    nessunVoto: 'no grades',
    schedaDiProva: (titolo) => `the sheet for “${titolo}”`,
    pianiConto: (quanti) =>
      `${plurale(quanti, 'plan', 'plans')} · in this course`,
    nessunPiano: 'This course has no lesson plans.',

    dellaClasse: 'For the class',
    dellaClasseAiuto: 'applies to all subjects, and to the whole year',
    fascicoloContiene: 'Learners, documents and absence periods',
    nomeFascicolo: 'the class file',

    ore: (quante) => plurale(quante, 'lesson', 'lessons'),
    nessunaOra: 'No lessons in the chosen period.',
    numero: 'No.',
    verbale: 'Lesson record',
    annullata: 'The lesson is cancelled: there’s nothing to record.',
    nonConclusa:
      'The lesson isn’t over yet: the lesson record would come out with no attendance and no ' +
      'review.',
    nomeVerbale: (giorno) => `the lesson record of ${giorno}`,
    verbaleInTesto: 'The same lesson record as text, to correct',
    nessunPianoCella: 'no plan',

    foto: 'Class photos',
    fotoAiuto: 'A face and a name for each learner: the sheet to take to class',
    nomeFoto: 'the face sheet',
    schedeConto: (persone, periodo) =>
      `${plurale(persone, 'learner', 'learners')} · one each · ${periodo}`,
    nessunaPersona: 'The class has no active learners.',
    supplenze: 'Substitutions',
    supplenzeAiuto:
      'the lessons taught in place of another teacher: the course sheet with those alone',
    oreDiSupplenza: (quante, periodo) =>
      `${plurale(quante, 'lesson taught', 'lessons taught')} · ${periodo}`,
    nessunaSupplenza:
      'No substitutions taught in the chosen period. A lesson is marked as a substitution ' +
      'by editing it from the calendar.',
    schedaSupplenze: 'Substitutions sheet',
    nomeSchedaSupplenze: 'the substitutions sheet',
    schedaDiPersona: (nome) => `the sheet for ${nome}`,
    dettaglioCorso: 'Course',
    dettaglioDocenteClasse: 'Class teacher',
    schedaDiPersonaCorso: (nome) => `the course sheet for ${nome}`,
    schedaDiPersonaClasse: (nome) => `the class teacher sheet for ${nome}`,
    linguette: 'Course or project',
    progettoConto: (persone) =>
      `${plurale(persone, 'learner', 'learners')} · one report each · the whole project`,
  },
})

// I testi della pagina dei piani lezione (`plans.ts`): l'elenco delle ore del
// corso con le loro scalette, e il piano aperto.

import { catalogo } from '../../../core/i18n/index.js'
import { plurale } from '../../../core/dominio/text.js'

const it = {
  fuoriSemestri: 'Fuori dai semestri',
  scalettaVuota: 'scaletta ancora vuota',
  scoperti: (durata: string) => `${durata} scoperti`,
  oltre: (durata: string) => `${durata} oltre l’ora`,
  senzaPiano: (quando: string) => `${quando} · senza piano — preparala`,

  // L'elenco
  piani: 'Piani',
  ore: (preparate: number, tutte: number) => `${preparate}/${tutte} lezioni`,
  cerca: 'cerca per data, obiettivo, tappa',
  nienteCorrisponde: 'Questo corso non ha lezioni che corrispondono.',
  nessunCorso:
    'Nessun corso da guardare: creane uno, e le sue lezioni compariranno qui.',
  preparate: (preparate: number, tutte: number) =>
    `${preparate}/${tutte} preparate`,
  nonAssegnati: (quanti: number) => `Non ancora assegnati (${quanti})`,
  senzaCorso: 'Senza corso',
  daRiagganciare: 'da riagganciare',
  corsoSparito: (argomento: string) =>
    `${argomento} · il corso non c’è più: riaprilo e scegline uno`,

  // Il piano aperto
  toltoAltrove: 'Non c’è più: è stato tolto altrove.',
  nonSalvato: 'Non salvato.',
  doveFinisce: 'Dove finisce',
  usatoNelleLezioni: 'Usato nelle lezioni',
  provaDaFare: 'prova da fare',
  valutazioniUscite: 'Valutazioni che ne sono uscite',
  senzaClasse: 'senza classe',
  siSalva: 'quel che si scrive si salva da sé',

  // La testata
  navigatoreLezioni: 'Navigatore delle lezioni',
  precedente: 'Lezione precedente',
  successiva: 'Lezione successiva',
  vaiAProssimaDaPreparare: 'Prima da preparare',
  tuttePreparate: 'Tutte le lezioni hanno un piano',
  pianoGenerato: 'Piano generato e assegnato.',
  daCalibrare: 'Da calibrare',
  nessunCorsoDaPreparare: 'nessun corso da preparare',
  senzaScaletta: (quante: number) =>
    plurale(
      quante,
      'lezione ancora senza scaletta',
      'lezioni ancora senza scaletta',
    ),
  tutteConScaletta: 'ogni lezione di questo corso ha la sua scaletta',
  nessunPiano: 'Nessun piano lezione',
  generaPiano: 'Genera piano',
  nessunPianoTesto:
    'Un piano tiene obiettivi e scaletta con i tempi, e appartiene alla lezione per cui ' +
    'lo si prepara. Si comincia da una lezione senza scaletta, nell’elenco qui accanto.',
  nessunPianoLezione: (nome: string) =>
    `La lezione ${nome} non ha ancora un piano. Creane uno per stabilire gli obiettivi e la scaletta delle attività.`,
  strumentiCollegati: 'Pendenze e Check del corso',
  spazioInScaletta: 'inserisci attività nella scaletta per evaderle durante l’ora',
  pendenzeDelCorso: 'Pendenze da evadere',
  checkDelCorso: 'Check',
  inserisciNellaScaletta: 'Inserisci nella scaletta',
  giaInScaletta: 'già in scaletta',
  ritiroConsegna: (titolo: string) => `Ritiro: ${titolo}`,
  verificaCheck: (titolo: string) => `Check: ${titolo}`,
  inseritaInScaletta: (titolo: string) => `Attività «${titolo}» inserita nella scaletta.`,
}

export const testi = catalogo(it, {
  de: {
    fuoriSemestri: 'Ausserhalb der Semester',
    scalettaVuota: 'Ablauf noch leer',
    scoperti: (durata) => `${durata} nicht abgedeckt`,
    oltre: (durata) => `${durata} über die Stunde hinaus`,
    senzaPiano: (quando) => `${quando} · ohne Plan — bereite sie vor`,

    piani: 'Pläne',
    ore: (preparate, tutte) => `${preparate}/${tutte} Std.`,
    cerca: 'nach Datum, Ziel, Etappe suchen',
    nienteCorrisponde: 'Dieser Kurs hat keine passenden Stunden.',
    nessunCorso:
      'Kein Kurs zum Anzeigen: Lege einen an, und seine Stunden erscheinen hier.',
    preparate: (preparate, tutte) => `${preparate}/${tutte} vorbereitet`,
    nonAssegnati: (quanti) => `Noch nicht zugewiesen (${quanti})`,
    senzaCorso: 'Ohne Kurs',
    daRiagganciare: 'neu zuzuordnen',
    corsoSparito: (argomento) =>
      `${argomento} · den Kurs gibt es nicht mehr: öffne den Plan und wähle einen`,

    toltoAltrove: 'Gibt es nicht mehr: wurde anderswo entfernt.',
    nonSalvato: 'Nicht gespeichert.',
    doveFinisce: 'Wo er verwendet wird',
    usatoNelleLezioni: 'Verwendet in den Stunden',
    provaDaFare: 'Prüfung ausstehend',
    valutazioniUscite: 'Daraus entstandene Beurteilungen',
    senzaClasse: 'ohne Klasse',
    siSalva: 'was man schreibt, speichert sich selbst',

    navigatoreLezioni: 'Stundennavigator',
    precedente: 'Vorherige Stunde',
    successiva: 'Nächste Stunde',
    vaiAProssimaDaPreparare: 'Erste vorzubereiten',
    tuttePreparate: 'Alle Stunden haben einen Plan',
    pianoGenerato: 'Plan erstellt und zugewiesen.',
    daCalibrare: 'Anzupassen',
    nessunCorsoDaPreparare: 'kein Kurs vorzubereiten',
    senzaScaletta: (quante) =>
      plurale(quante, 'Stunde noch ohne Ablauf', 'Stunden noch ohne Ablauf'),
    tutteConScaletta: 'jede Stunde dieses Kurses hat ihren Ablauf',
    nessunPiano: 'Kein Unterrichtsplan',
    generaPiano: 'Plan generieren',
    nessunPianoTesto:
      'Ein Plan enthält Ziele und Ablauf mit den Zeiten und gehört zu der Stunde, für die man ' +
      'ihn vorbereitet. Man beginnt bei einer Stunde ohne Ablauf, in der Liste daneben.',
    nessunPianoLezione: (nome) =>
      `Die Stunde ${nome} hat noch keinen Plan. Erstelle einen, um Ziele und Ablauf festzulegen.`,
    strumentiCollegati: 'Pendenzen und Checks des Kurses',
    spazioInScaletta: 'Aktivitäten in den Ablauf einfügen, um sie während der Stunde zu erledigen',
    pendenzeDelCorso: 'Zu erledigende Pendenzen',
    checkDelCorso: 'Checks',
    inserisciNellaScaletta: 'In Ablauf einfügen',
    giaInScaletta: 'bereits im Ablauf',
    ritiroConsegna: (titolo) => `Einsammeln: ${titolo}`,
    verificaCheck: (titolo) => `Check: ${titolo}`,
    inseritaInScaletta: (titolo) => `Aktivität «${titolo}» in den Ablauf eingefügt.`,
  },
  fr: {
    fuoriSemestri: 'Hors des semestres',
    scalettaVuota: 'déroulement encore vide',
    scoperti: (durata) => `${durata} non couverts`,
    oltre: (durata) => `${durata} au-delà de la leçon`,
    senzaPiano: (quando) => `${quando} · sans plan — prépare-la`,

    piani: 'Plans',
    ore: (preparate, tutte) => `${preparate}/${tutte} leçons`,
    cerca: 'chercher par date, objectif, étape',
    nienteCorrisponde: 'Ce cours n’a pas de leçons qui correspondent.',
    nessunCorso:
      'Aucun cours à afficher : crées-en un, et ses leçons apparaîtront ici.',
    preparate: (preparate, tutte) => `${preparate}/${tutte} préparées`,
    nonAssegnati: (quanti) => `Pas encore attribués (${quanti})`,
    senzaCorso: 'Sans cours',
    daRiagganciare: 'à rattacher',
    corsoSparito: (argomento) =>
      `${argomento} · le cours n’existe plus : rouvre le plan et choisis-en un`,

    toltoAltrove: 'N’existe plus : il a été retiré ailleurs.',
    nonSalvato: 'Non enregistré.',
    doveFinisce: 'Où il est utilisé',
    usatoNelleLezioni: 'Utilisé dans les leçons',
    provaDaFare: 'épreuve à faire',
    valutazioniUscite: 'Évaluations qui en sont issues',
    senzaClasse: 'sans classe',
    siSalva: 'ce qu’on écrit s’enregistre tout seul',

    navigatoreLezioni: 'Navigateur des leçons',
    precedente: 'Leçon précédente',
    successiva: 'Leçon suivante',
    vaiAProssimaDaPreparare: 'Première à préparer',
    tuttePreparate: 'Toutes les leçons ont un plan',
    pianoGenerato: 'Plan généré et attribué.',
    daCalibrare: 'À ajuster',
    nessunCorsoDaPreparare: 'aucun cours à préparer',
    senzaScaletta: (quante) =>
      plurale(
        quante,
        'leçon encore sans déroulement',
        'leçons encore sans déroulement',
      ),
    tutteConScaletta: 'chaque leçon de ce cours a son déroulement',
    nessunPiano: 'Aucun plan de leçon',
    generaPiano: 'Générer le plan',
    nessunPianoTesto:
      'Un plan contient les objectifs et le déroulement avec les temps, et il appartient à ' +
      'la leçon pour laquelle on le prépare. On commence par une leçon sans déroulement, dans la ' +
      'liste ci-contre.',
    nessunPianoLezione: (nome) =>
      `La leçon ${nome} n’a pas encore de plan. Crées-en un pour définir les objectifs et le déroulement.`,
    strumentiCollegati: 'Tâches en suspens et checks du cours',
    spazioInScaletta: 'insérer des activités dans le déroulement pour les traiter pendant l’heure',
    pendenzeDelCorso: 'Tâches en suspens à traiter',
    checkDelCorso: 'Checks',
    inserisciNellaScaletta: 'Insérer dans le déroulement',
    giaInScaletta: 'déjà dans le déroulement',
    ritiroConsegna: (titolo) => `Rendu : ${titolo}`,
    verificaCheck: (titolo) => `Check : ${titolo}`,
    inseritaInScaletta: (titolo) => `Activité « ${titolo} » insérée dans le déroulement.`,
  },
  en: {
    fuoriSemestri: 'Outside the semesters',
    scalettaVuota: 'outline still empty',
    scoperti: (durata) => `${durata} uncovered`,
    oltre: (durata) => `${durata} over the lesson`,
    senzaPiano: (quando) => `${quando} · no plan — prepare it`,

    piani: 'Plans',
    ore: (preparate, tutte) => `${preparate}/${tutte} lessons`,
    cerca: 'search by date, objective, step',
    nienteCorrisponde: 'This course has no matching lessons.',
    nessunCorso:
      'No course to show: create one, and its lessons will appear here.',
    preparate: (preparate, tutte) => `${preparate}/${tutte} prepared`,
    nonAssegnati: (quanti) => `Not yet assigned (${quanti})`,
    senzaCorso: 'No course',
    daRiagganciare: 'to reattach',
    corsoSparito: (argomento) =>
      `${argomento} · the course no longer exists: reopen the plan and pick one`,

    toltoAltrove: 'No longer here: it was removed elsewhere.',
    nonSalvato: 'Not saved.',
    doveFinisce: 'Where it’s used',
    usatoNelleLezioni: 'Used in lessons',
    provaDaFare: 'test to do',
    valutazioniUscite: 'Assessments that came out of it',
    senzaClasse: 'no class',
    siSalva: 'what you write saves itself',

    navigatoreLezioni: 'Lesson navigator',
    precedente: 'Previous lesson',
    successiva: 'Next lesson',
    vaiAProssimaDaPreparare: 'First to prepare',
    tuttePreparate: 'All lessons have a plan',
    pianoGenerato: 'Plan generated and assigned.',
    daCalibrare: 'To adjust',
    nessunCorsoDaPreparare: 'no course to prepare',
    senzaScaletta: (quante) =>
      plurale(
        quante,
        'lesson still without an outline',
        'lessons still without an outline',
      ),
    tutteConScaletta: 'every lesson in this course has its outline',
    nessunPiano: 'No lesson plan',
    generaPiano: 'Generate plan',
    nessunPianoTesto:
      'A plan holds objectives and an outline with timings, and belongs to the lesson you ' +
      'prepare it for. Start from a lesson without an outline, in the list alongside.',
    nessunPianoLezione: (nome) =>
      `The lesson ${nome} has no plan yet. Create one to set objectives and the outline.`,
    strumentiCollegati: 'Pending items and checks of the course',
    spazioInScaletta: 'insert activities into the plan to address them during the lesson',
    pendenzeDelCorso: 'Pending items to clear',
    checkDelCorso: 'Checks',
    inserisciNellaScaletta: 'Insert into plan',
    giaInScaletta: 'already in plan',
    ritiroConsegna: (titolo) => `Collect: ${titolo}`,
    verificaCheck: (titolo) => `Check: ${titolo}`,
    inseritaInScaletta: (titolo) => `Activity "${titolo}" added to plan.`,
  },
})

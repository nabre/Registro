// I testi della pagina dei piani lezione (`plans.ts`): la testata e il piano
// aperto. Il navigatore fra le ore ha i suoi, in `plansNavigator.testi.ts`.

import { catalogo } from '#core/i18n/index.js'
import { plurale } from '#core/dominio/text.js'

const it = {
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
  nessunCorsoDaPreparare: 'nessun corso da preparare',
  senzaScaletta: (quante: number) =>
    plurale(
      quante,
      'lezione ancora senza scaletta',
      'lezioni ancora senza scaletta',
    ),
  tutteConScaletta: 'ogni lezione di questo corso ha la sua scaletta',
  nessunPiano: 'Nessun piano lezione',
  nessunPianoTesto:
    'Un piano tiene obiettivi e scaletta con i tempi, e appartiene alla lezione per cui ' +
    'lo si prepara. Si comincia da una lezione senza scaletta: la si sceglie con il ' +
    'navigatore in cima.',
  creaPiano: 'Crea il piano',
  assegnaPiano: 'Assegna un piano che c’è',
  creatoEAssegnato: 'Piano creato e assegnato alla lezione.',
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
  legaAllaTappa: 'Lega alla tappa del check',
  legaAllaTappaTitolo: (tappa: string) => `Verifica anche questa colonna nella tappa «${tappa}»`,
  legataAllaTappa: (colonna: string, tappa: string) => `«${colonna}» si verifica nella tappa «${tappa}».`,
}

export const testi = catalogo(it, {
  de: {
    toltoAltrove: 'Gibt es nicht mehr: wurde anderswo entfernt.',
    nonSalvato: 'Nicht gespeichert.',
    doveFinisce: 'Wo er verwendet wird',
    usatoNelleLezioni: 'Verwendet in den Stunden',
    provaDaFare: 'Prüfung ausstehend',
    valutazioniUscite: 'Daraus entstandene Beurteilungen',
    senzaClasse: 'ohne Klasse',
    siSalva: 'was man schreibt, speichert sich selbst',
    nessunCorsoDaPreparare: 'kein Kurs vorzubereiten',
    senzaScaletta: (quante) =>
      plurale(quante, 'Stunde noch ohne Ablauf', 'Stunden noch ohne Ablauf'),
    tutteConScaletta: 'jede Stunde dieses Kurses hat ihren Ablauf',
    nessunPiano: 'Kein Unterrichtsplan',
    nessunPianoTesto:
      'Ein Plan enthält Ziele und Ablauf mit den Zeiten und gehört zu der Stunde, für die man ' +
      'ihn vorbereitet. Man beginnt bei einer Stunde ohne Ablauf: Man wählt sie mit dem ' +
      'Navigator oben.',
    creaPiano: 'Plan erstellen',
    assegnaPiano: 'Bestehenden Plan zuweisen',
    creatoEAssegnato: 'Plan erstellt und der Stunde zugewiesen.',
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
    legaAllaTappa: 'Mit Check-Etappe verknüpfen',
    legaAllaTappaTitolo: (tappa) => `Diese Spalte auch in der Etappe «${tappa}» prüfen`,
    legataAllaTappa: (colonna, tappa) => `«${colonna}» wird in der Etappe «${tappa}» geprüft.`,
  },
  fr: {
    toltoAltrove: 'N’existe plus : il a été retiré ailleurs.',
    nonSalvato: 'Non enregistré.',
    doveFinisce: 'Où il est utilisé',
    usatoNelleLezioni: 'Utilisé dans les leçons',
    provaDaFare: 'épreuve à faire',
    valutazioniUscite: 'Évaluations qui en sont issues',
    senzaClasse: 'sans classe',
    siSalva: 'ce qu’on écrit s’enregistre tout seul',
    nessunCorsoDaPreparare: 'aucun cours à préparer',
    senzaScaletta: (quante) =>
      plurale(
        quante,
        'leçon encore sans déroulement',
        'leçons encore sans déroulement',
      ),
    tutteConScaletta: 'chaque leçon de ce cours a son déroulement',
    nessunPiano: 'Aucun plan de leçon',
    nessunPianoTesto:
      'Un plan contient les objectifs et le déroulement avec les temps, et il appartient à ' +
      'la leçon pour laquelle on le prépare. On commence par une leçon sans déroulement : on ' +
      'la choisit avec le navigateur en haut.',
    creaPiano: 'Créer le plan',
    assegnaPiano: 'Attribuer un plan existant',
    creatoEAssegnato: 'Plan créé et attribué à la leçon.',
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
    legaAllaTappa: 'Lier à l’étape du check',
    legaAllaTappaTitolo: (tappa) => `Vérifier aussi cette colonne à l’étape « ${tappa} »`,
    legataAllaTappa: (colonna, tappa) => `« ${colonna} » se vérifie à l’étape « ${tappa} ».`,
  },
  en: {
    toltoAltrove: 'No longer here: it was removed elsewhere.',
    nonSalvato: 'Not saved.',
    doveFinisce: 'Where it’s used',
    usatoNelleLezioni: 'Used in lessons',
    provaDaFare: 'test to do',
    valutazioniUscite: 'Assessments that came out of it',
    senzaClasse: 'no class',
    siSalva: 'what you write saves itself',
    nessunCorsoDaPreparare: 'no course to prepare',
    senzaScaletta: (quante) =>
      plurale(
        quante,
        'lesson still without an outline',
        'lessons still without an outline',
      ),
    tutteConScaletta: 'every lesson in this course has its outline',
    nessunPiano: 'No lesson plan',
    nessunPianoTesto:
      'A plan holds objectives and an outline with timings, and belongs to the lesson you ' +
      'prepare it for. Start from a lesson without an outline: pick it with the navigator ' +
      'at the top.',
    creaPiano: 'Create the plan',
    assegnaPiano: 'Assign an existing plan',
    creatoEAssegnato: 'Plan created and assigned to the lesson.',
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
    legaAllaTappa: 'Link to check step',
    legaAllaTappaTitolo: (tappa) => `Also check this column in the step "${tappa}"`,
    legataAllaTappa: (colonna, tappa) => `"${colonna}" is checked in the step "${tappa}".`,
  },
})

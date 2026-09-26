// I testi di `forms/plan.ts`: l'editor di un piano lezione, gli avvisi che dà
// aprendolo, e la finestra che assegna un piano a una lezione.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  // Gli avvisi aprendo la modifica.
  nessunCorso:
    'Nel registro non c’è nessun corso. Un piano è di un corso, e senza non si ' +
    'può salvare: crea prima il corso, dal «+» qui accanto al campo.',
  senzaCorso:
    'Questo piano non ha un corso: glielo ha tolto l’eliminazione del corso che ' +
    'citava. Scegline uno qui sopra — senza, il salvataggio viene rifiutato.',
  corsoSparito: 'Il corso che questo piano citava non esiste più. Scegline un altro qui sopra.',
  piuOre: (ore: number) =>
    `Questa scaletta è di ${ore} ore: quel che si cambia qui cambia in tutte. ` +
    'Per cambiarne una sola, duplica il piano e adatta la copia.',
  oreConSpunte: (ore: number) =>
    `${ore === 1 ? 'Un’ora ha' : `${ore} ore hanno`} già le spunte ` +
    'di quel che si è fatto. Togliendo una tappa se ne va anche la sua spunta; ' +
    'gli argomenti e il consuntivo già scritti restano.',
  momentiDalleTappe: (momenti: number, voti: number) =>
    `Da queste tappe ${momenti === 1 ? 'è nato un momento' : `sono nati ${momenti} momenti`} ` +
    `di valutazione${voti > 0 ? ` con ${voti} voti già messi` : ''}. Togliendo la tappa che ` +
    'lo ha prodotto i voti restano dove sono, ma il momento non sa più da dove viene.',
  nonSalvato: 'Il piano non si è potuto salvare.',

  // L'editor.
  diCheCosaParla: 'Di che cosa parla',
  aiutoCorsoDettato: 'Lo dice l’ora scelta qui accanto. Per usare il piano altrove lo si duplica.',
  aiutoCorso: 'Il piano è di questo corso. Per usarlo altrove lo si duplica e lo si adatta.',
  obiettivi: 'Obiettivi',
  aiutoObiettivi: 'Uno per riga.',
  prerequisiti: 'Prerequisiti',
  aiutoPrerequisiti: 'Che cosa devono già sapere per starci dietro.',
  etichette: 'Etichette',
  segnapostoEtichette: 'algebra, recupero',
  aiutoEtichette: 'Separate da virgola: servono a ritrovare il piano.',
  aiutoNote: 'Per me: com’è andata l’altra volta, che cosa cambiare.',
  aiutoScaletta: 'Ogni tappa porta con sé il suo materiale e dice se è una valutazione.',
  allegareSalva: 'Allegare un file salva subito il piano: il file dev’essere di qualcuno.',
  risorseDelPiano: 'Risorse del piano',
  aiutoRisorse:
    'File e immagini vengono copiati nell’archivio del registro, accanto agli ' +
    'altri documenti del corso: il piano regge anche l’anno prossimo.',

  // La finestra del piano.
  modificaPiano: 'Modifica piano lezione',
  nuovoPiano: 'Nuovo piano lezione',
  aggiornato: 'Piano aggiornato.',
  creato: 'Piano creato.',
  duplicato: 'Piano duplicato.',
  eliminato: 'Piano eliminato.',

  // La scelta del piano per una lezione.
  creatoEAssegnato: 'Piano creato e assegnato a questa lezione.',
  assegnaUnPiano: 'Assegna un piano lezione',
  nessunPiano: 'Nessun piano preparato',
  nessunPianoTesto: 'I piani si preparano una volta e si riusano su più lezioni.',
  creaUnPiano: 'Crea un piano',
  lezioneDi: (durata: string) => `La lezione è di ${durata}.`,
  attivitaPer: (quante: number, durata: string) => `${quante} attività · ${durata}`,
  prove: (quante: number) => (quante === 1 ? 'una prova' : `${quante} prove`),
  minutiInPiu: (minuti: number) => `+${minuti} min`,
  minutiInMeno: (minuti: number) => `−${minuti} min`,
  inOrario: 'in orario',
  assegnato: 'Piano assegnato.',
  nuovoPerLaLezione: 'Nuovo piano per questa lezione',
  togliAssegnato: 'Togli il piano assegnato',
  rimosso: 'Piano rimosso dalla lezione.',
}

export const testi = catalogo(it, {
  de: {
    nessunCorso:
      'Im Klassenbuch gibt es noch keinen Kurs. Ein Plan gehört zu einem Kurs und lässt sich ' +
      'ohne ihn nicht speichern: Erstelle zuerst den Kurs, mit dem «+» hier neben dem Feld.',
    senzaCorso:
      'Dieser Plan hat keinen Kurs: Er hat ihn verloren, als der Kurs gelöscht wurde, auf den ' +
      'er verwies. Wähle oben einen aus — ohne Kurs wird das Speichern abgelehnt.',
    corsoSparito:
      'Der Kurs, auf den dieser Plan verwies, existiert nicht mehr. Wähle oben einen anderen aus.',
    piuOre: (ore) =>
      `Dieser Ablauf gehört zu ${ore} Stunden: Was du hier änderst, ändert sich in allen. ` +
      'Um nur eine zu ändern, duplizierst du den Plan und passt die Kopie an.',
    oreConSpunte: (ore) =>
      `${ore === 1 ? 'Eine Stunde hat' : `${ore} Stunden haben`} schon Häkchen für das, ` +
      'was gemacht wurde. Entfernst du eine Etappe, verschwindet auch ihr Häkchen; ' +
      'bereits geschriebene Themen und Rückblicke bleiben.',
    momentiDalleTappe: (momenti, voti) =>
      `Aus diesen Etappen ${momenti === 1
        ? 'ist eine Leistungsbeurteilung'
        : `sind ${momenti} Leistungsbeurteilungen`} entstanden` +
      (voti > 0
        ? `, mit ${plurale(voti, 'bereits gesetzten Note', 'bereits gesetzten Noten')}`
        : '') +
      '. Entfernst du die Etappe, aus der sie stammt, bleiben die Noten, wo sie sind, aber die ' +
      'Beurteilung weiss nicht mehr, woher sie kommt.',
    nonSalvato: 'Der Plan konnte nicht gespeichert werden.',

    diCheCosaParla: 'Worum es geht',
    aiutoCorsoDettato:
      'Das ergibt sich aus der Stunde, die daneben gewählt ist. Um den Plan anderswo zu ' +
      'verwenden, duplizierst du ihn.',
    aiutoCorso:
      'Der Plan gehört zu diesem Kurs. Um ihn anderswo zu verwenden, duplizierst du ihn und ' +
      'passt ihn an.',
    obiettivi: 'Lernziele',
    aiutoObiettivi: 'Eines pro Zeile.',
    prerequisiti: 'Voraussetzungen',
    aiutoPrerequisiti: 'Was sie schon wissen müssen, um mitzukommen.',
    etichette: 'Schlagwörter',
    segnapostoEtichette: 'Algebra, Repetition',
    aiutoEtichette: 'Durch Komma getrennt: Damit findest du den Plan wieder.',
    aiutoNote: 'Für mich: wie es letztes Mal lief, was ich ändern will.',
    aiutoScaletta: 'Jede Etappe bringt ihr Material mit und sagt, ob sie eine Beurteilung ist.',
    allegareSalva:
      'Eine Datei anzuhängen speichert den Plan sofort: Die Datei muss zu etwas gehören.',
    risorseDelPiano: 'Ressourcen des Plans',
    aiutoRisorse:
      'Dateien und Bilder werden ins Archiv des Klassenbuchs kopiert, zu den anderen Dokumenten ' +
      'des Kurses: So hält der Plan auch im nächsten Jahr.',

    modificaPiano: 'Unterrichtsplan bearbeiten',
    nuovoPiano: 'Neuer Unterrichtsplan',
    aggiornato: 'Plan aktualisiert.',
    creato: 'Plan erstellt.',
    duplicato: 'Plan dupliziert.',
    eliminato: 'Plan gelöscht.',

    creatoEAssegnato: 'Plan erstellt und dieser Stunde zugewiesen.',
    assegnaUnPiano: 'Unterrichtsplan zuweisen',
    nessunPiano: 'Kein Plan vorbereitet',
    nessunPianoTesto:
      'Einen Plan bereitest du einmal vor und verwendest ihn für mehrere Stunden.',
    creaUnPiano: 'Plan erstellen',
    lezioneDi: (durata) => `Die Stunde dauert ${durata}.`,
    attivitaPer: (quante, durata) => `${plurale(quante, 'Aktivität', 'Aktivitäten')} · ${durata}`,
    prove: (quante) => (quante === 1 ? 'eine Prüfung' : `${quante} Prüfungen`),
    minutiInPiu: (minuti) => `+${minuti} min`,
    minutiInMeno: (minuti) => `−${minuti} min`,
    inOrario: 'im Zeitplan',
    assegnato: 'Plan zugewiesen.',
    nuovoPerLaLezione: 'Neuer Plan für diese Stunde',
    togliAssegnato: 'Zugewiesenen Plan entfernen',
    rimosso: 'Plan von der Stunde entfernt.',
  },
  fr: {
    nessunCorso:
      'Le registre ne contient aucun cours. Un plan appartient à un cours, et sans cours il ' +
      'ne peut pas être enregistré : crée d’abord le cours, avec le « + » juste à côté ' +
      'du champ.',
    senzaCorso:
      'Ce plan n’a pas de cours : il l’a perdu quand le cours auquel il renvoyait a été ' +
      'supprimé. Choisis-en un ci-dessus — sans cours, l’enregistrement est refusé.',
    corsoSparito:
      'Le cours auquel ce plan renvoyait n’existe plus. Choisis-en un autre ci-dessus.',
    piuOre: (ore) =>
      `Ce déroulement sert à ${ore} leçons : ce que tu changes ici change partout. ` +
      'Pour n’en changer qu’une, duplique le plan et adapte la copie.',
    oreConSpunte: (ore) =>
      `${ore === 1 ? 'Une leçon a' : `${ore} leçons ont`} déjà des coches pour ce qui a été ` +
      'fait. Si tu retires une étape, sa coche disparaît aussi ; les sujets et le bilan déjà ' +
      'écrits restent.',
    momentiDalleTappe: (momenti, voti) =>
      `${momenti === 1
        ? 'Une évaluation est née'
        : `${momenti} évaluations sont nées`} de ces étapes` +
      (voti > 0 ? `, avec ${plurale(voti, 'note déjà saisie', 'notes déjà saisies')}` : '') +
      '. Si tu retires l’étape qui l’a produite, les notes restent où elles sont, mais ' +
      'l’évaluation ne sait plus d’où elle vient.',
    nonSalvato: 'Le plan n’a pas pu être enregistré.',

    diCheCosaParla: 'De quoi il s’agit',
    aiutoCorsoDettato:
      'C’est la leçon choisie juste à côté qui le dit. Pour utiliser le plan ailleurs, ' +
      'on le duplique.',
    aiutoCorso:
      'Le plan appartient à ce cours. Pour l’utiliser ailleurs, on le duplique et on l’adapte.',
    obiettivi: 'Objectifs',
    aiutoObiettivi: 'Un par ligne.',
    prerequisiti: 'Prérequis',
    aiutoPrerequisiti: 'Ce qu’ils doivent déjà savoir pour suivre.',
    etichette: 'Mots-clés',
    segnapostoEtichette: 'algèbre, rattrapage',
    aiutoEtichette: 'Séparés par une virgule : ils servent à retrouver le plan.',
    aiutoNote: 'Pour moi : comment ça s’est passé la dernière fois, ce qu’il faut changer.',
    aiutoScaletta: 'Chaque étape emporte son matériel et indique si c’est une évaluation.',
    allegareSalva:
      'Joindre un fichier enregistre aussitôt le plan : le fichier doit appartenir à ' +
      'quelque chose.',
    risorseDelPiano: 'Ressources du plan',
    aiutoRisorse:
      'Les fichiers et les images sont copiés dans l’archive du registre, à côté des autres ' +
      'documents du cours : le plan tient aussi l’an prochain.',

    modificaPiano: 'Modifier le plan de leçon',
    nuovoPiano: 'Nouveau plan de leçon',
    aggiornato: 'Plan mis à jour.',
    creato: 'Plan créé.',
    duplicato: 'Plan dupliqué.',
    eliminato: 'Plan supprimé.',

    creatoEAssegnato: 'Plan créé et attribué à cette leçon.',
    assegnaUnPiano: 'Attribuer un plan de leçon',
    nessunPiano: 'Aucun plan préparé',
    nessunPianoTesto: 'Un plan se prépare une fois et se réutilise sur plusieurs leçons.',
    creaUnPiano: 'Créer un plan',
    lezioneDi: (durata) => `La leçon dure ${durata}.`,
    attivitaPer: (quante, durata) => `${plurale(quante, 'activité', 'activités')} · ${durata}`,
    prove: (quante) => (quante === 1 ? 'une épreuve' : `${quante} épreuves`),
    minutiInPiu: (minuti) => `+${minuti} min`,
    minutiInMeno: (minuti) => `−${minuti} min`,
    inOrario: 'dans les temps',
    assegnato: 'Plan attribué.',
    nuovoPerLaLezione: 'Nouveau plan pour cette leçon',
    togliAssegnato: 'Retirer le plan attribué',
    rimosso: 'Plan retiré de la leçon.',
  },
  en: {
    nessunCorso:
      'There are no courses in the register. A plan belongs to a course and can’t be saved ' +
      'without one: create the course first, using the “+” next to the field.',
    senzaCorso:
      'This plan has no course: it lost it when the course it referred to was deleted. ' +
      'Choose one above — without one, saving is refused.',
    corsoSparito: 'The course this plan referred to no longer exists. Choose another one above.',
    piuOre: (ore) =>
      `This outline is used in ${ore} lessons: whatever you change here changes in all of them. ` +
      'To change just one, duplicate the plan and adapt the copy.',
    oreConSpunte: (ore) =>
      `${ore === 1 ? 'One lesson already has' : `${ore} lessons already have`} ticks for what ` +
      'was done. Removing a step also removes its tick; topics and reviews already written stay.',
    momentiDalleTappe: (momenti, voti) =>
      `${momenti === 1
        ? 'An assessment has come'
        : `${momenti} assessments have come`} from these steps` +
      `${voti > 0 ? `, with ${plurale(voti, 'grade', 'grades')} already entered` : ''}. ` +
      'If you remove the step it came from, the grades stay where they are, but the ' +
      'assessment no longer knows where it came from.',
    nonSalvato: 'The plan couldn’t be saved.',

    diCheCosaParla: 'What it’s about',
    aiutoCorsoDettato:
      'It comes from the lesson chosen alongside. To use the plan elsewhere, duplicate it.',
    aiutoCorso: 'The plan belongs to this course. To use it elsewhere, duplicate it and adapt it.',
    obiettivi: 'Objectives',
    aiutoObiettivi: 'One per line.',
    prerequisiti: 'Prerequisites',
    aiutoPrerequisiti: 'What they need to know already to keep up.',
    etichette: 'Tags',
    segnapostoEtichette: 'algebra, revision',
    aiutoEtichette: 'Separated by commas: they help you find the plan again.',
    aiutoNote: 'For me: how it went last time, what to change.',
    aiutoScaletta: 'Each step carries its own materials and says whether it’s an assessment.',
    allegareSalva:
      'Attaching a file saves the plan straight away: the file has to belong somewhere.',
    risorseDelPiano: 'Plan resources',
    aiutoRisorse:
      'Files and images are copied into the register’s archive, alongside the course’s other ' +
      'documents: the plan still holds up next year.',

    modificaPiano: 'Edit lesson plan',
    nuovoPiano: 'New lesson plan',
    aggiornato: 'Plan updated.',
    creato: 'Plan created.',
    duplicato: 'Plan duplicated.',
    eliminato: 'Plan deleted.',

    creatoEAssegnato: 'Plan created and assigned to this lesson.',
    assegnaUnPiano: 'Assign a lesson plan',
    nessunPiano: 'No plans prepared',
    nessunPianoTesto: 'You prepare a plan once and reuse it across several lessons.',
    creaUnPiano: 'Create a plan',
    lezioneDi: (durata) => `The lesson lasts ${durata}.`,
    attivitaPer: (quante, durata) => `${plurale(quante, 'activity', 'activities')} · ${durata}`,
    prove: (quante) => (quante === 1 ? 'one test' : `${quante} tests`),
    minutiInPiu: (minuti) => `+${minuti} min`,
    minutiInMeno: (minuti) => `−${minuti} min`,
    inOrario: 'on time',
    assegnato: 'Plan assigned.',
    nuovoPerLaLezione: 'New plan for this lesson',
    togliAssegnato: 'Remove the assigned plan',
    rimosso: 'Plan removed from the lesson.',
  },
})

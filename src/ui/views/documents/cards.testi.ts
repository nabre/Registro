// I testi dei riquadri della pagina Documenti (`cards.ts`).
// I nomi dei fogli («il conto delle presenze», «la scheda di …») entrano nelle
// frasi di `sheets.ts`: si scrivono con il loro articolo.

import { catalogo } from '../../../i18n/index.js'
import { PIF, Molti, quanti } from '../../../domain/lexicon.js'
import { plurale } from '../../../domain/text.js'

const it = {
  // Del corso
  delCorso: 'Del corso',
  tuttaLaClasse: (periodo: string) => `Di tutta la classe insieme · ${periodo}`,
  presenze: 'Presenze',
  nomePresenze: 'il conto delle presenze',
  valutazioni: 'Valutazioni',
  nomeValutazioni: 'la griglia dei voti',
  presenzeCsv: 'Presenze in CSV',
  nomePresenzeCsv: 'le presenze per il foglio di calcolo',
  valutazioniCsv: 'Valutazioni in CSV',
  nomeValutazioniCsv: 'i voti per il foglio di calcolo',

  // Le prove e i piani
  nessunaProva: 'Nessuna prova nel periodo scelto.',
  nessunVoto: 'nessun voto',
  schedaDiProva: (titolo: string) => `la scheda di «${titolo}»`,
  pianiConto: (quanti: number) => `${plurale(quanti, 'piano', 'piani')} · di questo corso`,
  nessunPiano: 'Questo corso non ha piani lezione.',

  // Della classe
  dellaClasse: 'Della classe',
  dellaClasseAiuto: 'vale per tutte le materie, e per l’anno intero',
  fascicoloContiene: `${Molti(PIF)}, documenti e periodi di assenze`,
  nomeFascicolo: 'il fascicolo della classe',

  // Le composizioni
  composizioni: 'Composizioni',
  quanteComposizioni: (quante: number) => plurale(quante, 'composizione', 'composizioni'),
  conOrfani: (quante: string, orfani: number) => `${quante} · ${orfani} senza elenco`,
  inUnPdf: (quante: string) => `${quante} · più documenti in un PDF solo`,
  mancanti: (dentro: number, tutti: number) =>
    `${dentro} dei ${tutti} documenti sono ancora nella cartella: rifacendolo ` +
    `adesso ne resterebbero fuori ${tutti - dentro}`,
  tuttiDentro: (tutti: number) => `${tutti} documenti dentro`,
  nomeComposizione: (nome: string) => `la composizione «${nome}»`,
  buttareTitolo: (nome: string) => `Buttare via «${nome}»?`,
  buttareComposizione:
    'Vanno via il PDF e l’elenco di che cosa ci sta dentro. I documenti che lo ' +
    'compongono restano dove sono, uno per uno.',
  senzaElenco: 'senza elenco',
  nomePdf: (nome: string) => `il PDF «${nome}»`,
  orfanoBloccato:
    'Questo PDF non ha più l’elenco di che cosa ci sta dentro: non si può rifare, ' +
    'si guarda e si butta via.',
  buttareOrfano:
    'Va via il PDF. Non si può rifare — l’elenco di che cosa ci stava dentro non c’è ' +
    'più — ma i documenti che lo componevano sono ancora nella cartella, uno per uno.',

  // Le lezioni
  ore: (quante: number) => plurale(quante, 'ora', 'ore'),
  nessunaOra: 'Nessun’ora nel periodo scelto.',
  numero: 'N.',
  verbale: 'Verbale',
  annullata: 'L’ora è annullata: non c’è niente da verbalizzare.',
  nonConclusa:
    'L’ora non è ancora conclusa: il verbale uscirebbe senza appello e senza consuntivo.',
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
  schedaDiPersona: (nome: string) => `la scheda di ${nome}`,
}

export const testi = catalogo(it, {
  de: {
    delCorso: 'Zum Kurs',
    tuttaLaClasse: (periodo) => `Für die ganze Klasse zusammen · ${periodo}`,
    presenze: 'Präsenzen',
    nomePresenze: 'die Präsenzübersicht',
    valutazioni: 'Beurteilungen',
    nomeValutazioni: 'die Notentabelle',
    presenzeCsv: 'Präsenzen als CSV',
    nomePresenzeCsv: 'die Präsenzen für die Tabellenkalkulation',
    valutazioniCsv: 'Beurteilungen als CSV',
    nomeValutazioniCsv: 'die Noten für die Tabellenkalkulation',

    nessunaProva: 'Keine Prüfung im gewählten Zeitraum.',
    nessunVoto: 'keine Noten',
    schedaDiProva: (titolo) => `das Blatt zu «${titolo}»`,
    pianiConto: (quanti) => `${plurale(quanti, 'Plan', 'Pläne')} · dieses Kurses`,
    nessunPiano: 'Dieser Kurs hat keine Unterrichtspläne.',

    dellaClasse: 'Zur Klasse',
    dellaClasseAiuto: 'gilt für alle Fächer und für das ganze Schuljahr',
    fascicoloContiene: 'Lernende, Dokumente und Absenzenzeiträume',
    nomeFascicolo: 'das Klassendossier',

    composizioni: 'Zusammenstellungen',
    quanteComposizioni: (quante) => plurale(quante, 'Zusammenstellung', 'Zusammenstellungen'),
    conOrfani: (quante, orfani) => `${quante} · ${orfani} ohne Liste`,
    inUnPdf: (quante) => `${quante} · mehrere Dokumente in einem einzigen PDF`,
    mancanti: (dentro, tutti) =>
      `${dentro} von ${tutti} Dokumenten sind noch im Ordner: Wenn man es jetzt neu erstellt, ` +
      `blieben ${tutti - dentro} draussen`,
    tuttiDentro: (tutti) => `${tutti} Dokumente darin`,
    nomeComposizione: (nome) => `die Zusammenstellung «${nome}»`,
    buttareTitolo: (nome) => `«${nome}» wegwerfen?`,
    buttareComposizione:
      'Das PDF und die Liste dessen, was darin steckt, werden entfernt. Die Dokumente, aus ' +
      'denen es besteht, bleiben einzeln, wo sie sind.',
    senzaElenco: 'ohne Liste',
    nomePdf: (nome) => `das PDF «${nome}»`,
    orfanoBloccato:
      'Dieses PDF hat die Liste seines Inhalts nicht mehr: Es lässt sich nicht neu erstellen, ' +
      'nur ansehen und wegwerfen.',
    buttareOrfano:
      'Das PDF wird entfernt. Neu erstellen lässt es sich nicht — die Liste seines Inhalts gibt ' +
      'es nicht mehr —, aber die Dokumente, aus denen es bestand, sind noch einzeln im Ordner.',

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
    fotoAiuto: 'Ein Gesicht und ein Name pro lernende Person: das Blatt fürs Schulzimmer',
    nomeFoto: 'das Blatt mit den Gesichtern',
    schedeConto: (persone, periodo) => `${persone} Lernende · eines pro Person · ${periodo}`,
    nessunaPersona: 'Die Klasse hat keine aktiven Lernenden.',
    schedaDiPersona: (nome) => `das Blatt von ${nome}`,
  },
  fr: {
    delCorso: 'Du cours',
    tuttaLaClasse: (periodo) => `De toute la classe ensemble · ${periodo}`,
    presenze: 'Présences',
    nomePresenze: 'le décompte des présences',
    valutazioni: 'Évaluations',
    nomeValutazioni: 'la grille des notes',
    presenzeCsv: 'Présences en CSV',
    nomePresenzeCsv: 'les présences pour le tableur',
    valutazioniCsv: 'Évaluations en CSV',
    nomeValutazioniCsv: 'les notes pour le tableur',

    nessunaProva: 'Aucune épreuve dans la période choisie.',
    nessunVoto: 'aucune note',
    schedaDiProva: (titolo) => `la fiche de « ${titolo} »`,
    pianiConto: (quanti) => `${plurale(quanti, 'plan', 'plans')} · de ce cours`,
    nessunPiano: 'Ce cours n’a pas de plans de leçon.',

    dellaClasse: 'De la classe',
    dellaClasseAiuto: 'vaut pour toutes les branches, et pour l’année entière',
    fascicoloContiene: 'Personnes en formation, documents et périodes d’absences',
    nomeFascicolo: 'le dossier de classe',

    composizioni: 'Compilations',
    quanteComposizioni: (quante) => plurale(quante, 'compilation', 'compilations'),
    conOrfani: (quante, orfani) => `${quante} · ${orfani} sans liste`,
    inUnPdf: (quante) => `${quante} · plusieurs documents dans un seul PDF`,
    mancanti: (dentro, tutti) =>
      `${dentro} des ${tutti} documents sont encore dans le dossier : en le refaisant ` +
      `maintenant, ${tutti - dentro} resteraient dehors`,
    tuttiDentro: (tutti) => `${tutti} documents dedans`,
    nomeComposizione: (nome) => `la compilation « ${nome} »`,
    buttareTitolo: (nome) => `Jeter « ${nome} » ?`,
    buttareComposizione:
      'Le PDF et la liste de ce qu’il contient s’en vont. Les documents qui le composent ' +
      'restent où ils sont, un par un.',
    senzaElenco: 'sans liste',
    nomePdf: (nome) => `le PDF « ${nome} »`,
    orfanoBloccato:
      'Ce PDF n’a plus la liste de ce qu’il contient : on ne peut pas le refaire, on le ' +
      'regarde et on le jette.',
    buttareOrfano:
      'Le PDF s’en va. On ne peut pas le refaire — la liste de ce qu’il contenait n’existe ' +
      'plus — mais les documents qui le composaient sont encore dans le dossier, un par un.',

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
    fotoAiuto: 'Un visage et un nom par personne en formation : la feuille à emporter en classe',
    nomeFoto: 'le trombinoscope',
    schedeConto: (persone, periodo) =>
      `${plurale(persone, 'personne en formation', 'personnes en formation')} · une chacune · ` +
      periodo,
    nessunaPersona: 'La classe n’a pas de personnes en formation actives.',
    schedaDiPersona: (nome) => `la fiche de ${nome}`,
  },
  en: {
    delCorso: 'For the course',
    tuttaLaClasse: (periodo) => `The whole class together · ${periodo}`,
    presenze: 'Attendance',
    nomePresenze: 'the attendance count',
    valutazioni: 'Assessments',
    nomeValutazioni: 'the grade grid',
    presenzeCsv: 'Attendance as CSV',
    nomePresenzeCsv: 'the attendance for the spreadsheet',
    valutazioniCsv: 'Assessments as CSV',
    nomeValutazioniCsv: 'the grades for the spreadsheet',

    nessunaProva: 'No tests in the chosen period.',
    nessunVoto: 'no grades',
    schedaDiProva: (titolo) => `the sheet for “${titolo}”`,
    pianiConto: (quanti) => `${plurale(quanti, 'plan', 'plans')} · in this course`,
    nessunPiano: 'This course has no lesson plans.',

    dellaClasse: 'For the class',
    dellaClasseAiuto: 'applies to all subjects, and to the whole year',
    fascicoloContiene: 'Learners, documents and absence periods',
    nomeFascicolo: 'the class file',

    composizioni: 'Compilations',
    quanteComposizioni: (quante) => plurale(quante, 'compilation', 'compilations'),
    conOrfani: (quante, orfani) => `${quante} · ${orfani} without a list`,
    inUnPdf: (quante) => `${quante} · several documents in a single PDF`,
    mancanti: (dentro, tutti) =>
      `${dentro} of the ${tutti} documents are still in the folder: remaking it now would ` +
      `leave ${tutti - dentro} out`,
    tuttiDentro: (tutti) => `${tutti} documents inside`,
    nomeComposizione: (nome) => `the compilation “${nome}”`,
    buttareTitolo: (nome) => `Throw away “${nome}”?`,
    buttareComposizione:
      'The PDF and the list of what’s inside it go. The documents that make it up stay where ' +
      'they are, one by one.',
    senzaElenco: 'no list',
    nomePdf: (nome) => `the PDF “${nome}”`,
    orfanoBloccato:
      'This PDF no longer has the list of what’s inside it: it can’t be remade, only viewed ' +
      'and thrown away.',
    buttareOrfano:
      'The PDF goes. It can’t be remade — the list of what was inside is gone — but the ' +
      'documents that made it up are still in the folder, one by one.',

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
    schedaDiPersona: (nome) => `the sheet for ${nome}`,
  },
})

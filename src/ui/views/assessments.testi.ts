// I testi della pagina dei momenti di valutazione (`views/assessments.ts`).

import { catalogo, numero, perNumero, minuscolo } from '../../i18n/index.js'
import { PIF } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { TipoValutazione } from '../../domain/models.js'
import type { MotivoOrfano } from '../../domain/orphans.js'
import { testi as motivi } from '../../domain/orphans.testi.js'
import { plurale } from '../../domain/text.js'

const it = {
  documentiAiuto: 'i PDF stanno nella cartella del registro, sotto allegati/',
  /** Il testo della prova, nel riquadro dei documenti. */
  verifica: 'Verifica',
  proveCorrette: 'Prove corrette',
  classeSenzaPif: `La classe non ha ${PIF.plurale} attive.`,
  /** Sotto il titolo del momento: il giorno, il tipo (la parola salvata), il peso, e se è sganciato. */
  sottotitolo: (data: string, tipo: TipoValutazione, peso: number, motivo: MotivoOrfano | null) =>
    `${data} · ${tipo} · peso ${peso}` +
    (motivo ? ` · sganciato: ${motivi.in('it')[motivo]}` : ''),
  vaiAllaLezione: 'Vai alla lezione',
  eliminaMomento: 'Elimina il momento di valutazione',
  momentoEliminato: 'Momento eliminato.',
  svoltoNellaLezione: (giorno: string) =>
    `Svolto nella lezione del ${giorno}: la data segue la lezione.`,
  lezioneSparita: 'La lezione collegata non c’è più: la data resta quella registrata.',
  votiMessi: 'voti messi',
  minimo: 'minimo',
  massimo: 'massimo',
  sufficienti: 'sufficienti',
  estremi: (minimo: string, massimo: string) => `da ${minimo} a ${massimo}`,
  nessunVoto: 'Nessun voto ancora inserito.',
  inserimento: 'Inserimento',
  sganciatiAltrove: (quanti: number) =>
    `${quanti === 1 ? 'Un momento sganciato' : `${quanti} momenti sganciati`} ` +
    'in altri corsi: si sistemano scegliendo il loro corso dalla tendina in cima.',
  eliminareSganciati: (quanti: number) =>
    `Eliminare ${quanti === 1 ? 'il momento sganciato' : `i ${quanti} momenti sganciati`}?`,
  eliminareSganciatiTesto: (voti: number) =>
    (voti > 0
      ? `Se ne ${voti === 1 ? 'va anche 1 voto' : `vanno anche ${voti} voti`}, e non si può tornare indietro. `
      : 'Nessuno di loro ha voti dentro. ') +
    'I PDF allegati escono dal documento dell’anno (non vanno nel cestino del sistema).',
  nonAgganciati: (quanti: number) =>
    quanti === 1
      ? 'Un momento non è agganciato a nessuna tappa del piano'
      : `${quanti} momenti non sono agganciati a nessuna tappa del piano`,
  eliminaTutti: 'Elimina tutti',
  eliminaTuttiAiuto: 'Butta via tutti i momenti sganciati elencati qui',
  spiegazioneSganciati: (altrove: number) =>
    'Un momento nasce dalla tappa del piano che dichiara di essere una prova. ' +
    'Questi vengono da prima, o hanno perso la tappa per strada: restano nelle ' +
    'medie, ma non si sa più da che cosa siano usciti.' +
    (altrove > 0 ? ` Altri ${altrove} in altri corsi.` : ''),
  apriQuestoMomento: 'Apri questo momento',
  /** Accanto a un momento sganciato: perché, e quanti voti porta. */
  rigaSganciato: (motivo: MotivoOrfano, voti: number) =>
    `${motivi.in('it')[motivo]}${voti > 0 ? ` · ${plurale(voti, 'voto', 'voti')}` : ' · nessun voto'}`,
  eliminaQuesto: (titolo: string) => `Elimina «${titolo}»`,
  nessunCorso: 'Nessun corso',
  nessunCorsoTesto:
    'I voti stanno dentro un corso — una materia a una classe — e prima si crea quello.',
  vaiAiCorsi: 'Vai ai corsi',
  suggerimento: (sigla: string) =>
    `Nelle caselle: il voto, oppure «${sigla}» per l’assenza — la stessa ` +
    'sigla dell’appello. Frecce e Invio per spostarsi.',
  nessunMomento: 'Nessun momento di valutazione',
  nessunMomentoTesto:
    'Un momento è una verifica, un orale, un progetto. Nasce dalla tappa del piano ' +
    'che dichiara di essere una prova, dentro la lezione in cui la si fa: da lì ' +
    'sa già titolo, tipo, peso e data. In questo corso non ce n’è ancora nessuno.',
}

export const testi = catalogo(it, {
  de: {
    documentiAiuto: 'Die PDFs liegen im Ordner des Klassenbuchs, unter allegati/',
    verifica: 'Aufgabenblatt',
    proveCorrette: 'Korrigierte Prüfungen',
    classeSenzaPif: 'Die Klasse hat keine aktiven Lernenden.',
    sottotitolo: (data, tipo, peso, motivo) =>
      `${data} · ${lessico.in('de').tipiValutazione[tipo]} · Gewichtung ${numero(peso)}` +
      (motivo ? ` · nicht verknüpft: ${motivi.in('de')[motivo]}` : ''),
    vaiAllaLezione: 'Zur Stunde',
    eliminaMomento: 'Leistungsbeurteilung löschen',
    momentoEliminato: 'Beurteilung gelöscht.',
    svoltoNellaLezione: (giorno) =>
      `Durchgeführt in der Stunde vom ${giorno}: Das Datum folgt der Stunde.`,
    lezioneSparita:
      'Die verknüpfte Stunde existiert nicht mehr: Das Datum bleibt das eingetragene.',
    votiMessi: 'Noten eingetragen',
    minimo: 'Minimum',
    massimo: 'Maximum',
    sufficienti: 'genügend',
    estremi: (minimo, massimo) => `von ${minimo} bis ${massimo}`,
    nessunVoto: 'Noch keine Note eingetragen.',
    inserimento: 'Erfassung',
    sganciatiAltrove: (quanti) =>
      `${quanti === 1 ? 'Eine nicht verknüpfte Beurteilung' : `${quanti} nicht verknüpfte Beurteilungen`} ` +
      'in anderen Kursen: Man bringt sie in Ordnung, indem man oben in der Auswahlliste ihren ' +
      'Kurs wählt.',
    eliminareSganciati: (quanti) =>
      `${quanti === 1 ? 'Die nicht verknüpfte Beurteilung' : `Die ${quanti} nicht verknüpften Beurteilungen`} löschen?`,
    eliminareSganciatiTesto: (voti) =>
      (voti > 0
        ? `Damit ${voti === 1 ? 'geht auch 1 Note' : `gehen auch ${voti} Noten`} verloren, ` +
          'und das lässt sich nicht rückgängig machen. '
        : 'Keine davon enthält Noten. ') +
      'Die angehängten PDFs verlassen das Dokument des Jahres (sie kommen nicht in den ' +
      'Papierkorb des Systems).',
    nonAgganciati: (quanti) =>
      quanti === 1
        ? 'Eine Beurteilung ist mit keiner Etappe des Plans verknüpft'
        : `${quanti} Beurteilungen sind mit keiner Etappe des Plans verknüpft`,
    eliminaTutti: 'Alle löschen',
    eliminaTuttiAiuto: 'Alle hier aufgeführten nicht verknüpften Beurteilungen wegwerfen',
    spiegazioneSganciati: (altrove) =>
      'Eine Beurteilung entsteht aus der Etappe des Plans, die sich als Prüfung ausweist. ' +
      'Diese hier stammen von früher oder haben ihre Etappe unterwegs verloren: Sie zählen ' +
      'weiter für die Durchschnitte, aber man weiss nicht mehr, woraus sie entstanden sind.' +
      (altrove > 0 ? ` Weitere ${altrove} in anderen Kursen.` : ''),
    apriQuestoMomento: 'Diese Beurteilung öffnen',
    rigaSganciato: (motivo, voti) =>
      `${motivi.in('de')[motivo]}${voti > 0 ? ` · ${plurale(voti, 'Note', 'Noten')}` : ' · keine Note'}`,
    eliminaQuesto: (titolo) => `«${titolo}» löschen`,
    nessunCorso: 'Kein Kurs',
    nessunCorsoTesto:
      'Noten gehören zu einem Kurs – ein Fach in einer Klasse –, und der wird zuerst erstellt.',
    vaiAiCorsi: 'Zu den Kursen',
    suggerimento: (sigla) =>
      `In den Feldern: die Note, oder «${sigla}» für eine Absenz – dasselbe Kürzel wie ` +
      'bei der Präsenzkontrolle. Mit den Pfeiltasten und Enter geht es weiter.',
    nessunMomento: 'Keine Leistungsbeurteilung',
    nessunMomentoTesto:
      'Eine Beurteilung ist eine Prüfung, eine mündliche Prüfung, ein Projekt. Sie entsteht ' +
      'aus der Etappe des Plans, die sich als Prüfung ausweist, in der Stunde, in der ' +
      'sie stattfindet: Von dort kennt sie schon Titel, Art, Gewichtung und Datum. In diesem ' +
      'Kurs gibt es noch keine.',
  },
  fr: {
    documentiAiuto: 'les PDF se trouvent dans le dossier du registre, sous allegati/',
    verifica: 'Énoncé',
    proveCorrette: 'Épreuves corrigées',
    classeSenzaPif: 'La classe n’a pas de personnes en formation actives.',
    sottotitolo: (data, tipo, peso, motivo) =>
      `${data} · ${minuscolo(lessico.in('fr').tipiValutazione[tipo])} · pondération ${numero(peso)}` +
      (motivo ? ` · détachée : ${motivi.in('fr')[motivo]}` : ''),
    vaiAllaLezione: 'Aller à la leçon',
    eliminaMomento: 'Supprimer l’évaluation',
    momentoEliminato: 'Évaluation supprimée.',
    svoltoNellaLezione: (giorno) => `Faite dans la leçon du ${giorno} : la date suit la leçon.`,
    lezioneSparita: 'La leçon liée n’existe plus : la date reste celle qui a été enregistrée.',
    votiMessi: 'notes saisies',
    minimo: 'minimum',
    massimo: 'maximum',
    sufficienti: 'suffisantes',
    estremi: (minimo, massimo) => `de ${minimo} à ${massimo}`,
    nessunVoto: 'Aucune note saisie pour l’instant.',
    inserimento: 'Saisie',
    sganciatiAltrove: (quanti) =>
      `${quanti === 1 ? 'Une évaluation détachée' : `${quanti} évaluations détachées`} ` +
      'dans d’autres cours : on les règle en choisissant leur cours dans la liste en haut.',
    eliminareSganciati: (quanti) =>
      `Supprimer ${quanti === 1 ? 'l’évaluation détachée' : `les ${quanti} évaluations détachées`} ?`,
    eliminareSganciatiTesto: (voti) =>
      (voti > 0
        ? `${voti === 1 ? '1 note disparaît' : `${voti} notes disparaissent`} aussi, ` +
          'et on ne peut pas revenir en arrière. '
        : 'Aucune ne contient de notes. ') +
      'Les PDF joints sortent du document de l’année (ils ne vont pas dans la corbeille ' +
      'du système).',
    nonAgganciati: (quanti) =>
      quanti === 1
        ? 'Une évaluation n’est rattachée à aucune étape du plan'
        : `${quanti} évaluations ne sont rattachées à aucune étape du plan`,
    eliminaTutti: 'Tout supprimer',
    eliminaTuttiAiuto: 'Jeter toutes les évaluations détachées listées ici',
    spiegazioneSganciati: (altrove) =>
      'Une évaluation naît de l’étape du plan qui se déclare épreuve. Celles-ci datent ' +
      'd’avant, ou ont perdu leur étape en route : elles restent dans les moyennes, mais on ' +
      'ne sait plus d’où elles viennent.' +
      (altrove > 0 ? ` ${altrove} ${perNumero(altrove, 'autre', 'autres')} dans d’autres cours.` : ''),
    apriQuestoMomento: 'Ouvrir cette évaluation',
    rigaSganciato: (motivo, voti) =>
      `${motivi.in('fr')[motivo]}${voti > 0 ? ` · ${plurale(voti, 'note', 'notes')}` : ' · pas de note'}`,
    eliminaQuesto: (titolo) => `Supprimer « ${titolo} »`,
    nessunCorso: 'Aucun cours',
    nessunCorsoTesto:
      'Les notes se trouvent dans un cours – une branche pour une classe – et c’est lui ' +
      'qu’on crée d’abord.',
    vaiAiCorsi: 'Aller aux cours',
    suggerimento: (sigla) =>
      `Dans les cases : la note, ou « ${sigla} » pour l’absence – la même lettre qu’à ` +
      'l’appel. Flèches et Entrée pour se déplacer.',
    nessunMomento: 'Aucune évaluation',
    nessunMomentoTesto:
      'Une évaluation, c’est un contrôle, un oral, un projet. Elle naît de l’étape du plan ' +
      'qui se déclare épreuve, dans la leçon où elle a lieu : de là, elle connaît déjà ' +
      'titre, type, pondération et date. Dans ce cours, il n’y en a encore aucune.',
  },
  en: {
    documentiAiuto: 'the PDFs are in the register’s folder, under allegati/',
    verifica: 'Test paper',
    proveCorrette: 'Marked tests',
    classeSenzaPif: 'The class has no active learners.',
    sottotitolo: (data, tipo, peso, motivo) =>
      `${data} · ${minuscolo(lessico.in('en').tipiValutazione[tipo])} · weight ${numero(peso)}` +
      (motivo ? ` · unlinked: ${motivi.in('en')[motivo]}` : ''),
    vaiAllaLezione: 'Go to the lesson',
    eliminaMomento: 'Delete the assessment',
    momentoEliminato: 'Assessment deleted.',
    svoltoNellaLezione: (giorno) => `Held in the lesson of ${giorno}: the date follows the lesson.`,
    lezioneSparita: 'The linked lesson is gone: the date stays as it was recorded.',
    votiMessi: 'grades entered',
    minimo: 'lowest',
    massimo: 'highest',
    sufficienti: 'passes',
    estremi: (minimo, massimo) => `from ${minimo} to ${massimo}`,
    nessunVoto: 'No grades entered yet.',
    inserimento: 'Entry',
    sganciatiAltrove: (quanti) =>
      `${quanti === 1 ? 'One unlinked assessment' : `${quanti} unlinked assessments`} ` +
      'in other courses: sort them out by choosing their course from the drop-down at the top.',
    eliminareSganciati: (quanti) =>
      `Delete ${quanti === 1 ? 'the unlinked assessment' : `the ${quanti} unlinked assessments`}?`,
    eliminareSganciatiTesto: (voti) =>
      (voti > 0
        ? `${voti === 1 ? '1 grade goes' : `${voti} grades go`} with them, and it can’t be undone. `
        : 'None of them has any grades. ') +
      'The attached PDFs leave the year’s document (they don’t go to the system recycle bin).',
    nonAgganciati: (quanti) =>
      quanti === 1
        ? 'One assessment isn’t linked to any step of the plan'
        : `${quanti} assessments aren’t linked to any step of the plan`,
    eliminaTutti: 'Delete all',
    eliminaTuttiAiuto: 'Throw away all the unlinked assessments listed here',
    spiegazioneSganciati: (altrove) =>
      'An assessment is born from the plan step that declares itself a test. These date ' +
      'from before, or lost their step along the way: they stay in the averages, but nobody ' +
      'knows any more where they came from.' +
      (altrove > 0 ? ` ${altrove} more in other courses.` : ''),
    apriQuestoMomento: 'Open this assessment',
    rigaSganciato: (motivo, voti) =>
      `${motivi.in('en')[motivo]}${voti > 0 ? ` · ${plurale(voti, 'grade', 'grades')}` : ' · no grade'}`,
    eliminaQuesto: (titolo) => `Delete “${titolo}”`,
    nessunCorso: 'No course',
    nessunCorsoTesto:
      'Grades live inside a course – one subject for one class – and that comes first.',
    vaiAiCorsi: 'Go to courses',
    suggerimento: (sigla) =>
      `In the boxes: the grade, or “${sigla}” for an absence – the same letter as in ` +
      'attendance. Arrow keys and Enter to move around.',
    nessunMomento: 'No assessments',
    nessunMomentoTesto:
      'An assessment is a test, an oral, a project. It is born from the plan step that ' +
      'declares itself a test, inside the lesson where it takes place: from there it already ' +
      'knows its title, type, weight and date. There are none in this course yet.',
  },
})

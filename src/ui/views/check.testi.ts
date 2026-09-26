// I testi del check (`check.ts`).
import { catalogo } from '../../i18n/index.js'
import { PIF } from '../../domain/lexicon.js'

const it = {
  // La domanda prima di togliere una colonna.
  togliere: (titolo: string) => `Togliere «${titolo}»?`,
  nienteDaPerdere: 'Nessuna casella di questa colonna è spuntata: non si perde niente.',
  togliLaColonna: 'Togli la colonna',

  // Il menu di una casella.
  spuntaInLezione: 'Spunta in questa lezione',
  spuntaOggi: 'Spunta oggi',
  scegliData: 'Scegli la data…',
  assegnaAllaLezione: 'Assegna alla lezione corrente',
  cambiaData: 'Cambia la data…',
  togliSpunta: 'Togli la spunta',

  // Il menu di una colonna.
  spuntaTuttiInLezione: 'Spunta tutti in questa lezione',
  spuntaTuttiOggi: 'Spunta tutti oggi',
  giaTutti: 'L’hanno già spuntata tutti',
  spuntaVuote: (vuote: number) =>
    `Spunta ${vuote === 1 ? 'l’unica casella vuota' : `le ${vuote} caselle vuote`}; ` +
    'quelle già spuntate tengono il loro giorno',
  aggiungiColonna: 'Aggiungi una colonna…',
  spostaASinistra: 'Sposta a sinistra',
  spostaADestra: 'Sposta a destra',
  togliLaColonnaMenu: 'Togli la colonna…',

  // Il suggerimento su una casella.
  spuntataInLezione: (giorno: string) => `Spuntata in lezione, ${giorno}`,
  spuntataAMano: (giorno: string) => `Spuntata ${giorno} — data scelta a mano`,
  clicPerSpuntare: (inLezione: boolean) =>
    `Clic per spuntare ${inLezione ? 'in questa lezione' : 'oggi'}; ` +
    'tasto destro per scegliere la data.',
  clicPerTogliere: 'Clic per togliere la spunta; tasto destro per cambiare la data.',
  clicFermo: (inLezione: boolean) =>
    `Spuntata ${inLezione ? 'in un altro giorno' : 'in un giorno che non è oggi'}: ` +
    'il clic non la cambia — tasto destro per cambiarla o toglierla.',
  daFare: (chi: string) => `${chi}: da fare`,
  spuntataIl: (chi: string, giorno: string, clicToglie: boolean) =>
    `${chi}: spuntata il ${giorno} — ` +
    (clicToglie ? 'clic per togliere' : 'tasto destro per cambiarla'),
  comeInLezione: (giorno: string) => `${giorno}, in lezione`,
  comeAMano: (giorno: string) => `${giorno}, a mano`,

  // La griglia.
  testata: (titolo: string, fatte: number, totale: number) =>
    `${titolo}: ${fatte} su ${totale}. Clic o tasto destro per il menu.`,
  nonFrequentaPiu: 'non frequenta più',
  checkDi: (corso: string) => `Check di ${corso}`,

  // Il pannello nell'ora.
  nessunCheck: 'Nessun check per questo corso. ',
  preparaColonne: 'Prepara le colonne nella pagina Check',
  aiutoOra: 'clic: fatto in questa lezione · tasto destro: un altro giorno, o toglierla',

  // La pagina.
  nessunCorso: 'Nessun corso',
  checkInUnCorso:
    'Il check sta dentro un corso — una materia a una classe — e prima si crea quello.',
  vaiAiCorsi: 'Vai ai corsi',
  suggerimento: (inLezione: boolean) =>
    (inLezione ? 'Un clic spunta nella lezione di oggi' : 'Un clic spunta con la data di oggi') +
    '; una casella spuntata si cambia o si toglie dal tasto destro. Sulle ' +
    'colonne, il menu per rinominarle, spostarle, toglierle.',
  nessunaColonna: 'Nessuna colonna',
  cheColonna:
    'Una colonna è una cosa da fare una volta, allievo per allievo: il regolamento ' +
    'firmato, il quaderno, la relazione. Ogni casella si spunta quando è fatta, e ' +
    'ricorda il giorno.',
  primaColonna: 'Aggiungi la prima colonna',
  classeVuota: `Nessun${PIF.genere === 'f' ? 'a' : ''} ${PIF.singolare} nella classe`,
  righeDelCheck: (classe: string) => `Le righe del check sono le ${PIF.plurale} di ${classe}.`,
}

export const testi = catalogo(it, {
  de: {
    togliere: (titolo) => `«${titolo}» entfernen?`,
    nienteDaPerdere: 'In dieser Spalte ist kein Feld abgehakt: Es geht nichts verloren.',
    togliLaColonna: 'Spalte entfernen',
    spuntaInLezione: 'In dieser Stunde abhaken',
    spuntaOggi: 'Heute abhaken',
    scegliData: 'Datum wählen…',
    assegnaAllaLezione: 'Der aktuellen Stunde zuordnen',
    cambiaData: 'Datum ändern…',
    togliSpunta: 'Häkchen entfernen',
    spuntaTuttiInLezione: 'Alle in dieser Stunde abhaken',
    spuntaTuttiOggi: 'Alle heute abhaken',
    giaTutti: 'Bei allen schon abgehakt',
    spuntaVuote: (vuote) =>
      `Hakt ${vuote === 1 ? 'das einzige leere Feld' : `die ${vuote} leeren Felder`} ab; ` +
      'bereits abgehakte behalten ihren Tag',
    aggiungiColonna: 'Spalte hinzufügen…',
    spostaASinistra: 'Nach links verschieben',
    spostaADestra: 'Nach rechts verschieben',
    togliLaColonnaMenu: 'Spalte entfernen…',
    spuntataInLezione: (giorno) => `In der Stunde abgehakt, ${giorno}`,
    spuntataAMano: (giorno) => `Abgehakt am ${giorno} — Datum von Hand gewählt`,
    clicPerSpuntare: (inLezione) =>
      `Klick hakt ${inLezione ? 'in dieser Stunde' : 'heute'} ab; ` +
      'Rechtsklick, um das Datum zu wählen.',
    clicPerTogliere: 'Klick entfernt das Häkchen; Rechtsklick, um das Datum zu ändern.',
    clicFermo: (inLezione) =>
      `${inLezione ? 'An einem anderen Tag abgehakt' : 'Nicht heute abgehakt'}: ` +
      'Ein Klick ändert daran nichts — Rechtsklick, um es zu ändern oder zu entfernen.',
    daFare: (chi) => `${chi}: offen`,
    spuntataIl: (chi, giorno, clicToglie) =>
      `${chi}: abgehakt am ${giorno} — ` +
      (clicToglie ? 'Klick zum Entfernen' : 'Rechtsklick zum Ändern'),
    comeInLezione: (giorno) => `${giorno}, in der Stunde`,
    comeAMano: (giorno) => `${giorno}, von Hand`,
    testata: (titolo, fatte, totale) =>
      `${titolo}: ${fatte} von ${totale}. Klick oder Rechtsklick für das Menü.`,
    nonFrequentaPiu: 'besucht nicht mehr',
    checkDi: (corso) => `Check für ${corso}`,
    nessunCheck: 'Kein Check für diesen Kurs. ',
    preparaColonne: 'Spalten auf der Seite Check vorbereiten',
    aiutoOra:
      'Klick: in dieser Stunde erledigt · Rechtsklick: anderer Tag oder entfernen',
    nessunCorso: 'Kein Kurs',
    checkInUnCorso:
      'Der Check gehört zu einem Kurs — einem Fach in einer Klasse —, und den legst du zuerst an.',
    vaiAiCorsi: 'Zu den Kursen',
    suggerimento: (inLezione) =>
      (inLezione
        ? 'Ein Klick hakt in der heutigen Stunde ab'
        : 'Ein Klick hakt mit dem heutigen Datum ab') +
      '; ein abgehaktes Feld änderst oder entfernst du mit Rechtsklick. Auf den ' +
      'Spalten öffnet sich das Menü, um sie umzubenennen, zu verschieben oder zu entfernen.',
    nessunaColonna: 'Keine Spalten',
    cheColonna:
      'Eine Spalte ist etwas, das einmal zu erledigen ist, bei allen Lernenden einzeln: das ' +
      'unterschriebene Reglement, das Heft, der Bericht. Jedes Feld wird abgehakt, wenn es ' +
      'erledigt ist, und merkt sich den Tag.',
    primaColonna: 'Erste Spalte hinzufügen',
    classeVuota: 'Keine Lernenden in der Klasse',
    righeDelCheck: (classe) => `Die Zeilen des Checks sind die Lernenden der Klasse ${classe}.`,
  },
  fr: {
    togliere: (titolo) => `Retirer « ${titolo} » ?`,
    nienteDaPerdere: 'Aucune case de cette colonne n’est cochée : rien ne se perd.',
    togliLaColonna: 'Retirer la colonne',
    spuntaInLezione: 'Cocher dans cette leçon',
    spuntaOggi: 'Cocher aujourd’hui',
    scegliData: 'Choisir la date…',
    assegnaAllaLezione: 'Attribuer à la leçon en cours',
    cambiaData: 'Changer la date…',
    togliSpunta: 'Retirer la coche',
    spuntaTuttiInLezione: 'Cocher pour tous dans cette leçon',
    spuntaTuttiOggi: 'Cocher pour tous aujourd’hui',
    giaTutti: 'Déjà cochée pour tous',
    spuntaVuote: (vuote) =>
      `Coche ${vuote === 1 ? 'la seule case vide' : `les ${vuote} cases vides`} ; ` +
      'celles déjà cochées gardent leur jour',
    aggiungiColonna: 'Ajouter une colonne…',
    spostaASinistra: 'Déplacer à gauche',
    spostaADestra: 'Déplacer à droite',
    togliLaColonnaMenu: 'Retirer la colonne…',
    spuntataInLezione: (giorno) => `Cochée en leçon, ${giorno}`,
    spuntataAMano: (giorno) => `Cochée le ${giorno} — date choisie à la main`,
    clicPerSpuntare: (inLezione) =>
      `Clic pour cocher ${inLezione ? 'dans cette leçon' : 'aujourd’hui'} ; ` +
      'clic droit pour choisir la date.',
    clicPerTogliere: 'Clic pour retirer la coche ; clic droit pour changer la date.',
    clicFermo: (inLezione) =>
      `Cochée ${inLezione ? 'un autre jour' : 'un jour qui n’est pas aujourd’hui'} : ` +
      'le clic ne la change pas — clic droit pour la changer ou la retirer.',
    daFare: (chi) => `${chi} : à faire`,
    spuntataIl: (chi, giorno, clicToglie) =>
      `${chi} : cochée le ${giorno} — ` +
      (clicToglie ? 'clic pour retirer' : 'clic droit pour la changer'),
    comeInLezione: (giorno) => `${giorno}, en leçon`,
    comeAMano: (giorno) => `${giorno}, à la main`,
    testata: (titolo, fatte, totale) =>
      `${titolo} : ${fatte} sur ${totale}. Clic ou clic droit pour le menu.`,
    nonFrequentaPiu: 'ne suit plus',
    checkDi: (corso) => `Check de ${corso}`,
    nessunCheck: 'Aucun check pour ce cours. ',
    preparaColonne: 'Préparer les colonnes dans la page Check',
    aiutoOra: 'clic : fait dans cette leçon · clic droit : un autre jour, ou la retirer',
    nessunCorso: 'Aucun cours',
    checkInUnCorso:
      'Le check vit dans un cours — une branche donnée à une classe — et c’est lui ' +
      'qu’on crée d’abord.',
    vaiAiCorsi: 'Aller aux cours',
    suggerimento: (inLezione) =>
      (inLezione ? 'Un clic coche dans la leçon du jour' : 'Un clic coche avec la date du jour') +
      ' ; une case cochée se change ou se retire par clic droit. Sur les ' +
      'colonnes, le menu pour les renommer, les déplacer, les retirer.',
    nessunaColonna: 'Aucune colonne',
    cheColonna:
      'Une colonne, c’est une chose à faire une fois, personne par personne : le règlement ' +
      'signé, le cahier, le rapport. Chaque case se coche quand c’est fait, et garde le ' +
      'jour en mémoire.',
    primaColonna: 'Ajouter la première colonne',
    classeVuota: 'Aucune personne en formation dans la classe',
    righeDelCheck: (classe) =>
      `Les lignes du check sont les personnes en formation de la classe ${classe}.`,
  },
  en: {
    togliere: (titolo) => `Remove “${titolo}”?`,
    nienteDaPerdere: 'No box in this column is ticked: nothing is lost.',
    togliLaColonna: 'Remove the column',
    spuntaInLezione: 'Tick in this lesson',
    spuntaOggi: 'Tick today',
    scegliData: 'Choose the date…',
    assegnaAllaLezione: 'Assign to the current lesson',
    cambiaData: 'Change the date…',
    togliSpunta: 'Remove the tick',
    spuntaTuttiInLezione: 'Tick everyone in this lesson',
    spuntaTuttiOggi: 'Tick everyone today',
    giaTutti: 'Already ticked for everyone',
    spuntaVuote: (vuote) =>
      `Ticks ${vuote === 1 ? 'the only empty box' : `the ${vuote} empty boxes`}; ` +
      'those already ticked keep their day',
    aggiungiColonna: 'Add a column…',
    spostaASinistra: 'Move left',
    spostaADestra: 'Move right',
    togliLaColonnaMenu: 'Remove the column…',
    spuntataInLezione: (giorno) => `Ticked in a lesson, ${giorno}`,
    spuntataAMano: (giorno) => `Ticked on ${giorno} — date chosen by hand`,
    clicPerSpuntare: (inLezione) =>
      `Click to tick ${inLezione ? 'in this lesson' : 'today'}; ` +
      'right-click to choose the date.',
    clicPerTogliere: 'Click to remove the tick; right-click to change the date.',
    clicFermo: (inLezione) =>
      `Ticked ${inLezione ? 'on another day' : 'on a day other than today'}: ` +
      'clicking doesn’t change it — right-click to change or remove it.',
    daFare: (chi) => `${chi}: to do`,
    spuntataIl: (chi, giorno, clicToglie) =>
      `${chi}: ticked on ${giorno} — ` +
      (clicToglie ? 'click to remove' : 'right-click to change it'),
    comeInLezione: (giorno) => `${giorno}, in a lesson`,
    comeAMano: (giorno) => `${giorno}, by hand`,
    testata: (titolo, fatte, totale) =>
      `${titolo}: ${fatte} of ${totale}. Click or right-click for the menu.`,
    nonFrequentaPiu: 'no longer attending',
    checkDi: (corso) => `Check for ${corso}`,
    nessunCheck: 'No check for this course. ',
    preparaColonne: 'Prepare the columns on the Check page',
    aiutoOra: 'click: done in this lesson · right-click: another day, or remove it',
    nessunCorso: 'No course',
    checkInUnCorso:
      'The check lives inside a course — a subject taught to a class — so that comes first.',
    vaiAiCorsi: 'Go to courses',
    suggerimento: (inLezione) =>
      (inLezione ? 'A click ticks in today’s lesson' : 'A click ticks with today’s date') +
      '; a ticked box is changed or removed with a right-click. On the ' +
      'columns, the menu to rename, move or remove them.',
    nessunaColonna: 'No columns',
    cheColonna:
      'A column is something to do once, learner by learner: the signed rules, the ' +
      'exercise book, the report. Each box is ticked when it’s done, and remembers the day.',
    primaColonna: 'Add the first column',
    classeVuota: 'No learners in the class',
    righeDelCheck: (classe) => `The check’s rows are the learners of ${classe}.`,
  },
})

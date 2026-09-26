// I testi della sezione dell'anno scolastico (`settings/year.ts`).

import { catalogo } from '../../../i18n/index.js'
import { plurale } from '../../../domain/text.js'

const it = {
  annoNonCePiu: 'L’anno non c’è più: è stato tolto altrove.',

  // L'anno aperto.
  annoScolastico: 'Anno scolastico',
  annoScolasticoAiuto: 'la scansione su cui si contano le medie',
  nessunAnnoAperto: 'Nessun anno aperto',
  nessunAnnoTesto: (comeSiParte: string) =>
    `Classi, lezioni e valutazioni stanno tutte dentro un anno. ${comeSiParte}`,
  creaAnno: 'Crea l’anno scolastico',
  anno: (etichetta: string) => `Anno ${etichetta}`,
  cartella: (cartella: string) => ` · cartella ${cartella}/`,
  modificaAiuto: 'Date dell’anno e dei due semestri, insieme',
  valutazioni: (quante: number) => `${quante} valutazioni`,
  senzaSemestri:
    'Quest’anno non ha semestri: le medie di fine periodo non sanno dove cadere. Si ' +
    'mettono dal modulo dell’anno.',
  calendarioUfficiale: (voci: number) =>
    `Il calendario scolastico ufficiale ha ${plurale(voci, 'voce', 'voci')} — date, vacanze ` +
    'o festivi — che quest’anno non ha così. ',
  rivediImporta: 'Rivedi e importa',

  // Gli altri anni.
  lAnnoAperto: 'L’anno aperto',
  lAnnoApertoAiuto: 'ogni anno è un documento a sé: aprirne un altro cambia quel che si vede',
  apriAnno: 'Apri un anno…',
  nuovoAnno: 'Nuovo anno',
  nessunAnno: 'Nessun anno scolastico',
  siComincia: (comeSiParte: string) => `Si comincia da qui. ${comeSiParte}`,
  aperto: 'aperto',
  misure: (semestri: number, chiusure: number) => `${semestri} semestri · ${chiusure} chiusure`,
  modificaDate: 'Modifica le date',

  // Le chiusure.
  giorniSenzaLezione: 'Giorni senza lezione',
  chiusureAiuto: 'vacanze e chiusure: la generazione dell’orario le salta',
  chiusureSenzaAnno: 'Le chiusure appartengono a un anno: prima ce ne vuole uno.',
  periodiGiorni: (periodi: number, giorni: number) =>
    `${periodi} periodi · ${giorni} giorni in tutto`,
  nessunaChiusura: 'Nessuna chiusura dichiarata',
  nessunaChiusuraTesto:
    'Dichiarandole qui, le lezioni generate dall’orario saltano quei giorni invece di ' +
    'nascere e dover essere cancellate a mano.',
  aggiungiVacanze: 'Aggiungi le vacanze',
  giorni: (giorni: number) => `${giorni} giorni`,
  modificaChiusure: 'Modifica le chiusure dell’anno',
  togliChiusura: 'Togli questa chiusura',
  togliere: (etichetta: string) => `Togliere «${etichetta}»?`,
  togliereTesto:
    'Le lezioni già sul calendario restano dove sono: cambia solo quel che ' +
    'la generazione dell’orario salterà da qui in avanti.',
  tolta: (etichetta: string) => `«${etichetta}» tolta.`,

  // I tipi di settimana.
  tipiSettimana: 'Tipi di settimana',
  tipiSenzaAnnoAiuto: 'serve dove l’orario va a turni: A e B, o i tipi della lista',
  settimaneSenzaAnno: 'Le settimane appartengono a un anno: prima ce ne vuole uno.',
  alternanzaScritta: (dal: string) => `Alternanza scritta da ${dal}.`,
  togliereTipi: 'Togliere tutti i tipi?',
  settimaneTornano: (quante: number) =>
    `${plurale(quante, 'settimana torna', 'settimane tornano')} senza tipo. ` +
    'L’orario e le lezioni non si toccano.',
  togliTutto: 'Togli tutto',
  tipiTolti: 'Tipi tolti.',
  nessunaMarcata: 'nessuna marcata',
  marcate: (messe: number, tutte: number) => `${messe} settimane su ${tutte} marcate`,
  tipiAiuto:
    'serve solo dove l’orario va a turni. I tipi — A e B, o altri — sono la lista ' +
    '«Tipi di settimana» di Impostazioni › Liste',
  alterna: 'Alterna',
  alternaAiuto: (tipi: string) =>
    `Riempie l’anno girando su ${tipi} dalla prima ` +
    'marcata, saltando le chiusure',
  pulisci: 'Pulisci',
  pulisciAiuto: 'Toglie il tipo a tutte le settimane',
  settimanaDal: (numero: number, dal: string) => `Settimana ${numero} · dal ${dal}`,
  fuoriLista: (tipo: string) => `Tipo «${tipo}», non più nella lista: cliccando lo togli`,
  togliSettimana: (tipo: string) => `Settimana ${tipo}: cliccando la togli`,
  segnaSettimana: (tipo: string) => `Segna come settimana ${tipo}`,
}

export const testi = catalogo(it, {
  de: {
    annoNonCePiu: 'Das Jahr gibt es nicht mehr: Es wurde anderswo entfernt.',
    annoScolastico: 'Schuljahr',
    annoScolasticoAiuto: 'die Einteilung, nach der die Durchschnitte berechnet werden',
    nessunAnnoAperto: 'Kein Jahr offen',
    nessunAnnoTesto: (comeSiParte) =>
      `Klassen, Stunden und Beurteilungen gehören alle zu einem Jahr. ${comeSiParte}`,
    creaAnno: 'Schuljahr erstellen',
    anno: (etichetta) => `Jahr ${etichetta}`,
    cartella: (cartella) => ` · Ordner ${cartella}/`,
    modificaAiuto: 'Daten des Jahres und der beiden Semester, zusammen',
    valutazioni: (quante) => plurale(quante, 'Beurteilung', 'Beurteilungen'),
    senzaSemestri:
      'Dieses Jahr hat keine Semester: Die Durchschnitte am Ende des Zeitraums wissen nicht, ' +
      'wohin sie fallen. Man setzt sie im Formular des Jahres.',
    calendarioUfficiale: (voci) =>
      `Der offizielle Schulkalender hat ${plurale(voci, 'Eintrag', 'Einträge')} — Daten, ` +
      'Ferien oder Feiertage —, die dieses Jahr nicht so hat. ',
    rivediImporta: 'Prüfen und importieren',
    lAnnoAperto: 'Das offene Jahr',
    lAnnoApertoAiuto:
      'jedes Jahr ist ein eigenes Dokument: Ein anderes öffnen ändert, was man sieht',
    apriAnno: 'Jahr öffnen…',
    nuovoAnno: 'Neues Jahr',
    nessunAnno: 'Kein Schuljahr',
    siComincia: (comeSiParte) => `Hier fängt man an. ${comeSiParte}`,
    aperto: 'offen',
    misure: (semestri, chiusure) =>
      `${plurale(semestri, 'Semester', 'Semester')} · ` +
      `${plurale(chiusure, 'Schliessung', 'Schliessungen')}`,
    modificaDate: 'Daten bearbeiten',
    giorniSenzaLezione: 'Tage ohne Unterricht',
    chiusureAiuto: 'Ferien und Schliessungen: Das Erzeugen aus dem Stundenplan überspringt sie',
    chiusureSenzaAnno: 'Die Schliessungen gehören zu einem Jahr: Zuerst braucht es eines.',
    periodiGiorni: (periodi, giorni) =>
      `${plurale(periodi, 'Zeitraum', 'Zeiträume')} · ${plurale(giorni, 'Tag', 'Tage')} insgesamt`,
    nessunaChiusura: 'Keine Schliessung angegeben',
    nessunaChiusuraTesto:
      'Gibt man sie hier an, überspringen die aus dem Stundenplan erzeugten Stunden ' +
      'diese Tage, statt zu entstehen und von Hand gelöscht werden zu müssen.',
    aggiungiVacanze: 'Ferien hinzufügen',
    giorni: (giorni) => plurale(giorni, 'Tag', 'Tage'),
    modificaChiusure: 'Schliessungen des Jahres bearbeiten',
    togliChiusura: 'Diese Schliessung entfernen',
    togliere: (etichetta) => `«${etichetta}» entfernen?`,
    togliereTesto:
      'Die Stunden, die schon im Kalender stehen, bleiben, wo sie sind: Es ändert ' +
      'sich nur, was das Erzeugen aus dem Stundenplan von jetzt an überspringt.',
    tolta: (etichetta) => `«${etichetta}» entfernt.`,
    tipiSettimana: 'Wochentypen',
    tipiSenzaAnnoAiuto:
      'nötig, wo der Stundenplan im Wechsel läuft: A und B, oder die Typen der Liste',
    settimaneSenzaAnno: 'Die Wochen gehören zu einem Jahr: Zuerst braucht es eines.',
    alternanzaScritta: (dal) => `Wechsel ab ${dal} eingetragen.`,
    togliereTipi: 'Alle Typen entfernen?',
    settimaneTornano: (quante) =>
      `${plurale(quante, 'Woche ist', 'Wochen sind')} wieder ohne Typ. ` +
      'Stundenplan und Stunden bleiben unberührt.',
    togliTutto: 'Alles entfernen',
    tipiTolti: 'Typen entfernt.',
    nessunaMarcata: 'keine markiert',
    marcate: (messe, tutte) => `${messe} von ${tutte} Wochen markiert`,
    tipiAiuto:
      'nur nötig, wo der Stundenplan im Wechsel läuft. Die Typen — A und B, oder andere — sind ' +
      'die Liste «Wochentypen» unter Einstellungen › Listen',
    alterna: 'Abwechseln',
    alternaAiuto: (tipi) =>
      `Füllt das Jahr, abwechselnd ${tipi}, ab der ersten markierten Woche, ohne die ` +
      'Schliessungen',
    pulisci: 'Leeren',
    pulisciAiuto: 'Entfernt den Typ bei allen Wochen',
    settimanaDal: (numero, dal) => `Woche ${numero} · ab ${dal}`,
    fuoriLista: (tipo) => `Typ «${tipo}», nicht mehr in der Liste: Ein Klick entfernt ihn`,
    togliSettimana: (tipo) => `Woche ${tipo}: Ein Klick entfernt sie`,
    segnaSettimana: (tipo) => `Als Woche ${tipo} markieren`,
  },
  fr: {
    annoNonCePiu: 'L’année n’existe plus : elle a été retirée ailleurs.',
    annoScolastico: 'Année scolaire',
    annoScolasticoAiuto: 'le découpage sur lequel se calculent les moyennes',
    nessunAnnoAperto: 'Aucune année ouverte',
    nessunAnnoTesto: (comeSiParte) =>
      `Classes, leçons et évaluations se trouvent toutes dans une année. ${comeSiParte}`,
    creaAnno: 'Créer l’année scolaire',
    anno: (etichetta) => `Année ${etichetta}`,
    cartella: (cartella) => ` · dossier ${cartella}/`,
    modificaAiuto: 'Dates de l’année et des deux semestres, ensemble',
    valutazioni: (quante) => plurale(quante, 'évaluation', 'évaluations'),
    senzaSemestri:
      'Cette année n’a pas de semestres : les moyennes de fin de période ne savent pas où ' +
      'tomber. On les ajoute depuis le formulaire de l’année.',
    calendarioUfficiale: (voci) =>
      `Le calendrier scolaire officiel a ${plurale(voci, 'entrée', 'entrées')} — dates, ` +
      'vacances ou jours fériés — que cette année n’a pas ainsi. ',
    rivediImporta: 'Revoir et importer',
    lAnnoAperto: 'L’année ouverte',
    lAnnoApertoAiuto:
      'chaque année est un document à part : en ouvrir une autre change ce qu’on voit',
    apriAnno: 'Ouvrir une année…',
    nuovoAnno: 'Nouvelle année',
    nessunAnno: 'Aucune année scolaire',
    siComincia: (comeSiParte) => `On commence ici. ${comeSiParte}`,
    aperto: 'ouverte',
    misure: (semestri, chiusure) =>
      `${plurale(semestri, 'semestre', 'semestres')} · ` +
      `${plurale(chiusure, 'fermeture', 'fermetures')}`,
    modificaDate: 'Modifier les dates',
    giorniSenzaLezione: 'Jours sans cours',
    chiusureAiuto: 'vacances et fermetures : la génération de l’horaire les saute',
    chiusureSenzaAnno: 'Les fermetures appartiennent à une année : il en faut d’abord une.',
    periodiGiorni: (periodi, giorni) =>
      `${plurale(periodi, 'période', 'périodes')} · ${plurale(giorni, 'jour', 'jours')} en tout`,
    nessunaChiusura: 'Aucune fermeture déclarée',
    nessunaChiusuraTesto:
      'En les déclarant ici, les leçons générées depuis l’horaire sautent ces jours au lieu de ' +
      'naître et de devoir être supprimées à la main.',
    aggiungiVacanze: 'Ajouter les vacances',
    giorni: (giorni) => plurale(giorni, 'jour', 'jours'),
    modificaChiusure: 'Modifier les fermetures de l’année',
    togliChiusura: 'Retirer cette fermeture',
    togliere: (etichetta) => `Retirer « ${etichetta} » ?`,
    togliereTesto:
      'Les leçons déjà au calendrier restent où elles sont : seul change ce que la génération ' +
      'de l’horaire sautera à partir de maintenant.',
    tolta: (etichetta) => `« ${etichetta} » retirée.`,
    tipiSettimana: 'Types de semaine',
    tipiSenzaAnnoAiuto:
      'utile là où l’horaire va par alternance : A et B, ou les types de la liste',
    settimaneSenzaAnno: 'Les semaines appartiennent à une année : il en faut d’abord une.',
    alternanzaScritta: (dal) => `Alternance écrite depuis le ${dal}.`,
    togliereTipi: 'Retirer tous les types ?',
    settimaneTornano: (quante) =>
      `${plurale(quante, 'semaine revient', 'semaines reviennent')} sans type. ` +
      'L’horaire et les leçons ne sont pas touchés.',
    togliTutto: 'Tout retirer',
    tipiTolti: 'Types retirés.',
    nessunaMarcata: 'aucune marquée',
    marcate: (messe, tutte) => `${messe} semaines sur ${tutte} marquées`,
    tipiAiuto:
      'utile seulement là où l’horaire va par alternance. Les types — A et B, ou d’autres — ' +
      'sont la liste « Types de semaine » de Paramètres › Listes',
    alterna: 'Alterner',
    alternaAiuto: (tipi) =>
      `Remplit l’année en alternant ${tipi} depuis la première marquée, en sautant les ` +
      'fermetures',
    pulisci: 'Vider',
    pulisciAiuto: 'Retire le type de toutes les semaines',
    settimanaDal: (numero, dal) => `Semaine ${numero} · dès le ${dal}`,
    fuoriLista: (tipo) => `Type « ${tipo} », plus dans la liste : un clic le retire`,
    togliSettimana: (tipo) => `Semaine ${tipo} : un clic la retire`,
    segnaSettimana: (tipo) => `Marquer comme semaine ${tipo}`,
  },
  en: {
    annoNonCePiu: 'The year is gone: it was removed elsewhere.',
    annoScolastico: 'School year',
    annoScolasticoAiuto: 'the division the averages are calculated on',
    nessunAnnoAperto: 'No year open',
    nessunAnnoTesto: (comeSiParte) =>
      `Classes, lessons and assessments all live inside a year. ${comeSiParte}`,
    creaAnno: 'Create the school year',
    anno: (etichetta) => `Year ${etichetta}`,
    cartella: (cartella) => ` · folder ${cartella}/`,
    modificaAiuto: 'Dates of the year and of the two semesters, together',
    valutazioni: (quante) => plurale(quante, 'assessment', 'assessments'),
    senzaSemestri:
      'This year has no semesters: end-of-period averages don’t know where to fall. You add ' +
      'them from the year form.',
    calendarioUfficiale: (voci) =>
      `The official school calendar has ${plurale(voci, 'entry', 'entries')} — dates, ` +
      'holidays or public holidays — that this year does not have the same way. ',
    rivediImporta: 'Review and import',
    lAnnoAperto: 'The open year',
    lAnnoApertoAiuto: 'each year is a document of its own: opening another changes what you see',
    apriAnno: 'Open a year…',
    nuovoAnno: 'New year',
    nessunAnno: 'No school year',
    siComincia: (comeSiParte) => `This is where you start. ${comeSiParte}`,
    aperto: 'open',
    misure: (semestri, chiusure) =>
      `${plurale(semestri, 'semester', 'semesters')} · ` +
      `${plurale(chiusure, 'closure', 'closures')}`,
    modificaDate: 'Edit the dates',
    giorniSenzaLezione: 'Days without lessons',
    chiusureAiuto: 'holidays and closures: generating from the timetable skips them',
    chiusureSenzaAnno: 'Closures belong to a year: you need one first.',
    periodiGiorni: (periodi, giorni) =>
      `${plurale(periodi, 'period', 'periods')} · ${plurale(giorni, 'day', 'days')} in all`,
    nessunaChiusura: 'No closures set',
    nessunaChiusuraTesto:
      'If you set them here, lessons generated from the timetable skip those days instead of ' +
      'being created and having to be deleted by hand.',
    aggiungiVacanze: 'Add the holidays',
    giorni: (giorni) => plurale(giorni, 'day', 'days'),
    modificaChiusure: 'Edit the year’s closures',
    togliChiusura: 'Remove this closure',
    togliere: (etichetta) => `Remove “${etichetta}”?`,
    togliereTesto:
      'Lessons already on the calendar stay where they are: only what generating from the ' +
      'timetable will skip from now on changes.',
    tolta: (etichetta) => `“${etichetta}” removed.`,
    tipiSettimana: 'Week types',
    tipiSenzaAnnoAiuto: 'needed where the timetable rotates: A and B, or the types in the list',
    settimaneSenzaAnno: 'Weeks belong to a year: you need one first.',
    alternanzaScritta: (dal) => `Rotation written from ${dal}.`,
    togliereTipi: 'Remove all types?',
    settimaneTornano: (quante) =>
      `${plurale(quante, 'week goes', 'weeks go')} back to no type. ` +
      'The timetable and the lessons are not touched.',
    togliTutto: 'Remove all',
    tipiTolti: 'Types removed.',
    nessunaMarcata: 'none marked',
    marcate: (messe, tutte) => `${messe} of ${tutte} weeks marked`,
    tipiAiuto:
      'only needed where the timetable rotates. The types — A and B, or others — are the ' +
      '“Week types” list in Settings › Lists',
    alterna: 'Rotate',
    alternaAiuto: (tipi) =>
      `Fills the year rotating through ${tipi} from the first marked week, skipping the ` +
      'closures',
    pulisci: 'Clear',
    pulisciAiuto: 'Removes the type from every week',
    settimanaDal: (numero, dal) => `Week ${numero} · from ${dal}`,
    fuoriLista: (tipo) => `Type “${tipo}”, no longer in the list: click to remove it`,
    togliSettimana: (tipo) => `Week ${tipo}: click to remove it`,
    segnaSettimana: (tipo) => `Mark as week ${tipo}`,
  },
})

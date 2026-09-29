// I testi di `forms/year.ts`: l'anno scolastico, i suoi due semestri e le
// pause — vacanze e giorni di chiusura — che la generazione dell'orario salta.

import { catalogo } from '../../../core/i18n/index.js'
import { plurale } from '../../../core/dominio/text.js'

const it = {
  /** Le pause che quasi ogni anno ha: i nomi delle scorciatoie. */
  pauseTipiche: {
    autunno: 'Vacanze autunnali',
    natale: 'Vacanze di Natale',
    carnevale: 'Vacanze di carnevale',
    pasqua: 'Vacanze di Pasqua',
    istituto: 'Giornata d’istituto',
  },
  fuoriDallAnno: 'fuori dall’anno',
  giorni: (n: number) => plurale(n, 'giorno', 'giorni'),
  comeSiChiama: 'Come si chiama',
  togliPausa: 'Togli la chiusura',
  nessunaPausa: 'Nessuna chiusura.',
  suggerimentoPause:
    'Vacanze e giorni di chiusura si dichiarano qui, e la generazione ' +
    'dell’orario li salta.',
  pause: 'Chiusure',
  quanto: 'Quanto',
  aggiungiPausa: 'Aggiungi una chiusura',
  aggiungeTipica: (nome: string) => `Aggiunge «${nome}» nel periodo in cui cade di solito`,
  giorniSenzaLezione: (anno: string) => `Giorni senza lezione · ${anno}`,
  sottotitoloPause:
    'valgono per tutte le classi dell’anno, e la generazione dell’orario li salta',
  pauseAggiornate: 'Chiusure aggiornate.',
  /** Le date di un semestre nel modulo: «1° semestre: inizio». */
  inizioDi: (semestre: string) => `${semestre}: inizio`,
  fineDi: (semestre: string) => `${semestre}: fine`,
  anno: (etichetta: string) => `Anno ${etichetta}`,
  etichetta: 'Etichetta',
  semestri: 'Semestri',
  aiutoSemestri:
    'L’anno va da quando comincia il primo semestre a quando finisce il secondo: ' +
    'le sue date si ricavano da queste.',
  aiutoConfine: 'Il 2° semestre comincia il giorno dopo.',
  secondoDal: (data: string) => `2° semestre dal ${data}`,
  chiusureAltrove:
    'Vacanze e giorni di chiusura hanno un posto solo: Impostazioni › Calendario › Chiusure.',
  apriChiusure: 'Apri le chiusure',
  calendarioUfficiale: 'Calendario ufficiale',
  aiutoUfficialeAnno:
    'Inizio e fine delle lezioni, vacanze e festivi pubblicati dal cantone: si ' +
    'sceglie che cosa portare nell’anno, o si collega l’anno al calendario: allora inizio, ' +
    'fine e chiusure ufficiali non si cambiano più a mano finché non lo si stacca.',
  aiutoUfficialeNuovo:
    'Scelto l’anno in cima, inizio, fine, vacanze e festivi vengono dal calendario e ' +
    'restano bloccati; le pause proprie si aggiungono sotto. Con «date scritte a mano» ' +
    'tutto resta libero, e qui si vede che cosa manca.',
  aiutoPause:
    'Vacanze e giorni di chiusura: valgono per tutte le classi dell’anno, e la ' +
    'generazione dell’orario li salta.',
  importare: 'Importare dati da un altro registro?',
  aiutoImportare:
    'Classi, corsi e impostazioni si possono portare da un anno di prima, ' +
    'invece di rifarli a mano.',
  importaDa: 'Importa da un altro registro',
  aiutoImportaDa:
    'Appena l’anno è nato si apre la finestra per portarci, da un anno di prima, ' +
    'classi con persone e corsi, materie, impostazioni, piani e calendari',
  primoAlRovescio: 'Il 1° semestre deve finire dopo il suo inizio.',
  secondoAlRovescio: 'Il 2° semestre deve finire dopo il confine.',
  annoCreato: 'Anno scolastico creato.',
  annoAggiornato: 'Anno aggiornato.',
}

export const testi = catalogo(it, {
  de: {
    pauseTipiche: {
      autunno: 'Herbstferien',
      natale: 'Weihnachtsferien',
      carnevale: 'Fasnachtsferien',
      pasqua: 'Osterferien',
      istituto: 'Schulinterner Tag',
    },
    fuoriDallAnno: 'ausserhalb des Schuljahrs',
    giorni: (n) => plurale(n, 'Tag', 'Tage'),
    comeSiChiama: 'Wie er heisst',
    togliPausa: 'Schliessung entfernen',
    nessunaPausa: 'Keine Schliessungen.',
    suggerimentoPause:
      'Ferien und Schliessungstage trägst du hier ein, und beim Erzeugen der Stunden ' +
      'aus dem Stundenplan werden sie übersprungen.',
    pause: 'Schliessungen',
    quanto: 'Dauer',
    aggiungiPausa: 'Schliessung hinzufügen',
    aggiungeTipica: (nome) => `Fügt «${nome}» zur üblichen Zeit im Jahr hinzu`,
    giorniSenzaLezione: (anno) => `Tage ohne Unterricht · ${anno}`,
    sottotitoloPause:
      'gelten für alle Klassen des Schuljahrs, und beim Erzeugen der Stunden aus dem ' +
      'Stundenplan werden sie übersprungen',
    pauseAggiornate: 'Schliessungen aktualisiert.',
    inizioDi: (semestre) => `${semestre}: Beginn`,
    fineDi: (semestre) => `${semestre}: Ende`,
    anno: (etichetta) => `Schuljahr ${etichetta}`,
    etichetta: 'Bezeichnung',
    semestri: 'Semester',
    aiutoSemestri:
      'Das Schuljahr reicht vom Beginn des ersten bis zum Ende des zweiten Semesters: ' +
      'Seine Daten ergeben sich aus diesen.',
    aiutoConfine: 'Das 2. Semester beginnt am Tag danach.',
    secondoDal: (data) => `2. Semester ab ${data}`,
    chiusureAltrove:
      'Ferien und Schliessungstage haben einen einzigen Ort: Einstellungen › Kalender › ' +
      'Schliessungen.',
    apriChiusure: 'Schliessungen öffnen',
    calendarioUfficiale: 'Offizieller Schulkalender',
    aiutoUfficialeAnno:
      'Unterrichtsbeginn und -ende, Ferien und Feiertage, wie der Kanton sie veröffentlicht: ' +
      'Du wählst, was ins Schuljahr kommt, oder verknüpfst das Schuljahr mit dem Kalender: ' +
      'Dann lassen sich Beginn, Ende und offizielle Schliessungen nicht mehr von Hand ändern, ' +
      'bis du es wieder löst.',
    aiutoUfficialeNuovo:
      'Ist das Schuljahr oben gewählt, kommen Beginn, Ende, Ferien und Feiertage aus dem ' +
      'Kalender und bleiben gesperrt; eigene Unterbrüche fügst du unten hinzu. Mit «Daten ' +
      'von Hand eingegeben» bleibt alles frei, und hier siehst du, was fehlt.',
    aiutoPause:
      'Ferien und Schliessungstage: Sie gelten für alle Klassen des Schuljahrs, und beim ' +
      'Erzeugen der Stunden aus dem Stundenplan werden sie übersprungen.',
    importare: 'Daten aus einem anderen Klassenbuch übernehmen?',
    aiutoImportare:
      'Klassen, Kurse und Einstellungen lassen sich aus einem früheren Schuljahr ' +
      'übernehmen, statt sie von Hand neu anzulegen.',
    importaDa: 'Aus einem anderen Klassenbuch importieren',
    aiutoImportaDa:
      'Sobald das Schuljahr angelegt ist, öffnet sich das Fenster, um aus einem früheren ' +
      'Schuljahr Klassen mit Personen und Kursen, Fächer, Einstellungen, Pläne und ' +
      'Kalender zu übernehmen',
    primoAlRovescio: 'Das 1. Semester muss nach seinem Beginn enden.',
    secondoAlRovescio: 'Das 2. Semester muss nach der Semestergrenze enden.',
    annoCreato: 'Schuljahr erstellt.',
    annoAggiornato: 'Schuljahr aktualisiert.',
  },
  fr: {
    pauseTipiche: {
      autunno: 'Vacances d’automne',
      natale: 'Vacances de Noël',
      carnevale: 'Vacances de carnaval',
      pasqua: 'Vacances de Pâques',
      istituto: 'Journée d’établissement',
    },
    fuoriDallAnno: 'hors de l’année',
    giorni: (n) => plurale(n, 'jour', 'jours'),
    comeSiChiama: 'Son nom',
    togliPausa: 'Retirer la fermeture',
    nessunaPausa: 'Aucune fermeture.',
    suggerimentoPause:
      'Les vacances et les jours de fermeture se déclarent ici, et la génération des ' +
      'leçons depuis l’horaire les saute.',
    pause: 'Fermetures',
    quanto: 'Durée',
    aggiungiPausa: 'Ajouter une fermeture',
    aggiungeTipica: (nome) => `Ajoute « ${nome} » à la période où elle tombe d’habitude`,
    giorniSenzaLezione: (anno) => `Jours sans cours · ${anno}`,
    sottotitoloPause:
      'valent pour toutes les classes de l’année, et la génération des leçons depuis ' +
      'l’horaire les saute',
    pauseAggiornate: 'Fermetures mises à jour.',
    inizioDi: (semestre) => `${semestre} : début`,
    fineDi: (semestre) => `${semestre} : fin`,
    anno: (etichetta) => `Année ${etichetta}`,
    etichetta: 'Libellé',
    semestri: 'Semestres',
    aiutoSemestri:
      'L’année va du début du premier semestre à la fin du second : ses dates découlent ' +
      'de celles-ci.',
    aiutoConfine: 'Le 2e semestre commence le lendemain.',
    secondoDal: (data) => `2e semestre dès le ${data}`,
    chiusureAltrove:
      'Les vacances et les jours de fermeture ont une seule place : Paramètres › Calendrier › ' +
      'Fermetures.',
    apriChiusure: 'Ouvrir les fermetures',
    calendarioUfficiale: 'Calendrier officiel',
    aiutoUfficialeAnno:
      'Début et fin des cours, vacances et jours fériés publiés par le canton : tu choisis ' +
      'ce que tu reprends dans l’année, ou tu lies l’année au calendrier : début, fin et ' +
      'fermetures officielles ne se changent alors plus à la main tant que tu ne la ' +
      'détaches pas.',
    aiutoUfficialeNuovo:
      'Une fois l’année choisie en haut, début, fin, vacances et jours fériés viennent du ' +
      'calendrier et restent verrouillés ; tes propres interruptions s’ajoutent dessous. ' +
      'Avec « dates saisies à la main », tout reste libre, et on voit ici ce qui manque.',
    aiutoPause:
      'Vacances et jours de fermeture : ils valent pour toutes les classes de l’année, et ' +
      'la génération des leçons depuis l’horaire les saute.',
    importare: 'Importer des données d’un autre registre ?',
    aiutoImportare:
      'Les classes, les cours et les paramètres peuvent être repris d’une année ' +
      'précédente, au lieu d’être refaits à la main.',
    importaDa: 'Importer depuis un autre registre',
    aiutoImportaDa:
      'Dès que l’année est créée, la fenêtre s’ouvre pour y reprendre, depuis une année ' +
      'précédente, les classes avec personnes et cours, branches, paramètres, plans et ' +
      'calendriers',
    primoAlRovescio: 'Le 1er semestre doit se terminer après son début.',
    secondoAlRovescio: 'Le 2e semestre doit se terminer après la limite entre les semestres.',
    annoCreato: 'Année scolaire créée.',
    annoAggiornato: 'Année mise à jour.',
  },
  en: {
    pauseTipiche: {
      autunno: 'Autumn holidays',
      natale: 'Christmas holidays',
      carnevale: 'Carnival holidays',
      pasqua: 'Easter holidays',
      istituto: 'In-service day',
    },
    fuoriDallAnno: 'outside the year',
    giorni: (n) => plurale(n, 'day', 'days'),
    comeSiChiama: 'What it’s called',
    togliPausa: 'Remove the closure',
    nessunaPausa: 'No closures.',
    suggerimentoPause:
      'Holidays and closure days are set here, and generating lessons from the timetable ' +
      'skips them.',
    pause: 'Closures',
    quanto: 'How long',
    aggiungiPausa: 'Add a closure',
    aggiungeTipica: (nome) => `Adds “${nome}” at the time of year it usually falls`,
    giorniSenzaLezione: (anno) => `Days without lessons · ${anno}`,
    sottotitoloPause:
      'they apply to every class in the year, and generating lessons from the timetable ' +
      'skips them',
    pauseAggiornate: 'Closures updated.',
    inizioDi: (semestre) => `${semestre}: start`,
    fineDi: (semestre) => `${semestre}: end`,
    anno: (etichetta) => `School year ${etichetta}`,
    etichetta: 'Label',
    semestri: 'Semesters',
    aiutoSemestri:
      'The year runs from the start of the first semester to the end of the second: its ' +
      'dates come from these.',
    aiutoConfine: 'The 2nd semester starts the day after.',
    secondoDal: (data) => `2nd semester from ${data}`,
    chiusureAltrove: 'Holidays and closure days have one place only: Settings › Calendar › Closures.',
    apriChiusure: 'Open the closures',
    calendarioUfficiale: 'Official calendar',
    aiutoUfficialeAnno:
      'Start and end of lessons, holidays and public holidays published by the canton: ' +
      'you choose what to bring into the year, or link the year to the calendar: then start, ' +
      'end and official closures can’t be changed by hand until you unlink it.',
    aiutoUfficialeNuovo:
      'With the year chosen at the top, start, end, holidays and public holidays come from ' +
      'the calendar and stay locked; add your own breaks below. With “dates entered by hand” ' +
      'everything stays free, and you can see here what’s missing.',
    aiutoPause:
      'Holidays and closure days: they apply to every class in the year, and generating ' +
      'lessons from the timetable skips them.',
    importare: 'Import data from another register?',
    aiutoImportare:
      'Classes, courses and settings can be brought over from a previous year, instead of ' +
      'redoing them by hand.',
    importaDa: 'Import from another register',
    aiutoImportaDa:
      'As soon as the year is created, the window opens to bring over, from a previous ' +
      'year, classes with people and courses, subjects, settings, plans and calendars',
    primoAlRovescio: 'The 1st semester must end after it starts.',
    secondoAlRovescio: 'The 2nd semester must end after the semester boundary.',
    annoCreato: 'School year created.',
    annoAggiornato: 'Year updated.',
  },
})

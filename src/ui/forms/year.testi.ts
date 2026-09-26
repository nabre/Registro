// I testi di `forms/year.ts`: l'anno scolastico, i suoi due semestri e le
// pause — vacanze e giorni di chiusura — che la generazione dell'orario salta.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

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
  togliPausa: 'Togli la pausa',
  nessunaPausa: 'Nessuna pausa.',
  suggerimentoPause:
    'Vacanze e giorni di chiusura si dichiarano qui, e la generazione ' +
    'dell’orario li salta.',
  pause: 'Pause',
  quanto: 'Quanto',
  aggiungiPausa: 'Aggiungi pausa',
  aggiungeTipica: (nome: string) => `Aggiunge «${nome}» nel periodo in cui cade di solito`,
  giorniSenzaLezione: (anno: string) => `Giorni senza lezione · ${anno}`,
  sottotitoloPause:
    'valgono per tutte le classi dell’anno, e la generazione dell’orario li salta',
  pauseAggiornate: 'Pause aggiornate.',
  cominciaIl: 'Comincia il',
  finisceIl: 'Finisce il',
  anno: (etichetta: string) => `Anno ${etichetta}`,
  nuovoAnno: 'Nuovo anno scolastico',
  etichetta: 'Etichetta',
  semestri: 'Semestri',
  aiutoSemestri:
    'L’anno va da quando comincia il primo semestre a quando finisce il secondo: ' +
    'le sue date si ricavano da queste.',
  nomePrimo: 'Nome del 1° semestre',
  primoSemestre: '1° semestre',
  aiutoConfine: 'Il 2° semestre comincia il giorno dopo.',
  nomeSecondo: 'Nome del 2° semestre',
  secondoSemestre: '2° semestre',
  calendarioUfficiale: 'Calendario ufficiale',
  aiutoUfficialeAnno:
    'Inizio e fine delle lezioni, vacanze e festivi pubblicati dal cantone: si ' +
    'sceglie che cosa portare nell’anno. Le pause importate restano collegate, e se ' +
    'una versione nuova del registro ne corregge le date lo dice qui.',
  aiutoUfficialeNuovo:
    'Scelto l’anno in cima, vacanze e festivi sono già fra le pause qui sotto, ' +
    'collegate al calendario: quel che non serve si toglie dall’elenco, e se le ' +
    'date cambiano a mano qui si vede che cosa manca.',
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
    togliPausa: 'Unterbruch entfernen',
    nessunaPausa: 'Keine Unterbrüche.',
    suggerimentoPause:
      'Ferien und Schliessungstage trägst du hier ein, und beim Erzeugen der Stunden ' +
      'aus dem Stundenplan werden sie übersprungen.',
    pause: 'Unterbrüche',
    quanto: 'Dauer',
    aggiungiPausa: 'Unterbruch hinzufügen',
    aggiungeTipica: (nome) => `Fügt «${nome}» zur üblichen Zeit im Jahr hinzu`,
    giorniSenzaLezione: (anno) => `Tage ohne Unterricht · ${anno}`,
    sottotitoloPause:
      'gelten für alle Klassen des Schuljahrs, und beim Erzeugen der Stunden aus dem ' +
      'Stundenplan werden sie übersprungen',
    pauseAggiornate: 'Unterbrüche aktualisiert.',
    cominciaIl: 'Beginnt am',
    finisceIl: 'Endet am',
    anno: (etichetta) => `Schuljahr ${etichetta}`,
    nuovoAnno: 'Neues Schuljahr',
    etichetta: 'Bezeichnung',
    semestri: 'Semester',
    aiutoSemestri:
      'Das Schuljahr reicht vom Beginn des ersten bis zum Ende des zweiten Semesters: ' +
      'Seine Daten ergeben sich aus diesen.',
    nomePrimo: 'Name des 1. Semesters',
    primoSemestre: '1. Semester',
    aiutoConfine: 'Das 2. Semester beginnt am Tag danach.',
    nomeSecondo: 'Name des 2. Semesters',
    secondoSemestre: '2. Semester',
    calendarioUfficiale: 'Offizieller Schulkalender',
    aiutoUfficialeAnno:
      'Unterrichtsbeginn und -ende, Ferien und Feiertage, wie der Kanton sie veröffentlicht: ' +
      'Du wählst, was ins Schuljahr kommt. Importierte Unterbrüche bleiben verknüpft, und ' +
      'korrigiert eine neue Version des Klassenbuchs ihre Daten, steht es hier.',
    aiutoUfficialeNuovo:
      'Ist das Schuljahr oben gewählt, stehen Ferien und Feiertage schon bei den ' +
      'Unterbrüchen weiter unten, mit dem Kalender verknüpft: Was nicht gebraucht wird, ' +
      'entfernst du aus der Liste, und ändern sich die Daten von Hand, siehst du hier, ' +
      'was fehlt.',
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
    togliPausa: 'Retirer l’interruption',
    nessunaPausa: 'Aucune interruption.',
    suggerimentoPause:
      'Les vacances et les jours de fermeture se déclarent ici, et la génération des ' +
      'leçons depuis l’horaire les saute.',
    pause: 'Interruptions',
    quanto: 'Durée',
    aggiungiPausa: 'Ajouter une interruption',
    aggiungeTipica: (nome) => `Ajoute « ${nome} » à la période où elle tombe d’habitude`,
    giorniSenzaLezione: (anno) => `Jours sans cours · ${anno}`,
    sottotitoloPause:
      'valent pour toutes les classes de l’année, et la génération des leçons depuis ' +
      'l’horaire les saute',
    pauseAggiornate: 'Interruptions mises à jour.',
    cominciaIl: 'Commence le',
    finisceIl: 'Se termine le',
    anno: (etichetta) => `Année ${etichetta}`,
    nuovoAnno: 'Nouvelle année scolaire',
    etichetta: 'Libellé',
    semestri: 'Semestres',
    aiutoSemestri:
      'L’année va du début du premier semestre à la fin du second : ses dates découlent ' +
      'de celles-ci.',
    nomePrimo: 'Nom du 1er semestre',
    primoSemestre: '1er semestre',
    aiutoConfine: 'Le 2e semestre commence le lendemain.',
    nomeSecondo: 'Nom du 2e semestre',
    secondoSemestre: '2e semestre',
    calendarioUfficiale: 'Calendrier officiel',
    aiutoUfficialeAnno:
      'Début et fin des cours, vacances et jours fériés publiés par le canton : tu choisis ' +
      'ce que tu reprends dans l’année. Les interruptions importées restent liées, et si ' +
      'une nouvelle version du registre en corrige les dates, c’est indiqué ici.',
    aiutoUfficialeNuovo:
      'Une fois l’année choisie en haut, vacances et jours fériés sont déjà parmi les ' +
      'interruptions ci-dessous, liées au calendrier : ce qui ne sert pas se retire de la ' +
      'liste, et si les dates changent à la main, on voit ici ce qui manque.',
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
    togliPausa: 'Remove the break',
    nessunaPausa: 'No breaks.',
    suggerimentoPause:
      'Holidays and closure days are set here, and generating lessons from the timetable ' +
      'skips them.',
    pause: 'Breaks',
    quanto: 'How long',
    aggiungiPausa: 'Add a break',
    aggiungeTipica: (nome) => `Adds “${nome}” at the time of year it usually falls`,
    giorniSenzaLezione: (anno) => `Days without lessons · ${anno}`,
    sottotitoloPause:
      'they apply to every class in the year, and generating lessons from the timetable ' +
      'skips them',
    pauseAggiornate: 'Breaks updated.',
    cominciaIl: 'Starts on',
    finisceIl: 'Ends on',
    anno: (etichetta) => `School year ${etichetta}`,
    nuovoAnno: 'New school year',
    etichetta: 'Label',
    semestri: 'Semesters',
    aiutoSemestri:
      'The year runs from the start of the first semester to the end of the second: its ' +
      'dates come from these.',
    nomePrimo: 'Name of the 1st semester',
    primoSemestre: '1st semester',
    aiutoConfine: 'The 2nd semester starts the day after.',
    nomeSecondo: 'Name of the 2nd semester',
    secondoSemestre: '2nd semester',
    calendarioUfficiale: 'Official calendar',
    aiutoUfficialeAnno:
      'Start and end of lessons, holidays and public holidays published by the canton: ' +
      'you choose what to bring into the year. Imported breaks stay linked, and if a new ' +
      'version of the register corrects their dates, it says so here.',
    aiutoUfficialeNuovo:
      'With the year chosen at the top, holidays and public holidays are already among the ' +
      'breaks below, linked to the calendar: remove what you don’t need from the list, and ' +
      'if the dates are changed by hand, you can see here what’s missing.',
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

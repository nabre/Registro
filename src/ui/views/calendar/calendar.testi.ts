// I testi delle viste del calendario e delle loro parti comuni. Eventi ICS e
// menu del tasto destro hanno i loro (`ics.testi.ts`, `menus.testi.ts`).

import { catalogo } from '../../../i18n/index.js'
import { plurale } from '../../../domain/text.js'

/** «1°» → «1.», come si scrive un ordinale in tedesco. */
function ordinaleDe (numero: string): string {
  return numero.replace('°', '.')
}

/** «1°» → «1er», «2°» → «2e». */
function ordinaleFr (numero: string): string {
  const cifra = numero.replace('°', '')
  return cifra === '1' ? '1er' : `${cifra}e`
}

/** «1°» → «1st», «2°» → «2nd». */
function ordinaleEn (numero: string): string {
  const cifra = numero.replace('°', '')
  const coda: Readonly<Record<string, string>> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${cifra}${coda[cifra] ?? 'th'}`
}

const it = {
  // Le settimane
  settimana: (numero: number) => `Settimana ${numero}`,
  /** Minuscola, dentro un suggerimento: «settimana 12», «settimana A». */
  settimanaMinuscola: (quale: string | number) => `settimana ${quale}`,
  /** La sigla sopra la colonna dei numeri di settimana: «s. 12». */
  sigla: 's.',
  siglaNumero: (numero: number) => `s. ${numero}`,
  letteraSiCambia: 'Si cambia dalle Impostazioni, con tutte le settimane in fila',
  aprila: 'aprila',
  questaSettimana: 'questa settimana',
  nessunaLezione: 'nessuna lezione',
  oggi: 'oggi',
  adesso: (ora: string) => `adesso, ${ora}`,

  // I confini di semestre; l'etichetta è quella scritta dal docente
  cominciaSemestre: (etichetta: string) => `Comincia il ${etichetta}`,
  cominciaIl: (etichetta: string) => `comincia il ${etichetta}`,
  finisceIl: (etichetta: string) => `finisce il ${etichetta}`,
  /** Nella cella, dove c'è posto per poco: il numero è «1°», «2°». */
  fineBreve: (numero: string) => `fine ${numero}`,
  inizioBreve: (numero: string) => `inizio ${numero}`,
  primoSemestre: '1° semestre',
  secondoSemestre: '2° semestre',

  // L'agenda
  vuotoTitolo: 'Nessuna lezione nell’anno',
  vuotoTesto: 'Le lezioni si aggiungono una per una: non ci sono ricorrenze da impostare.',
  nuovaLezione: 'Nuova lezione',

  // I compleanni
  nonInAula: 'quel giorno non si ha lezione con la sua classe',

  // Il mese
  finisceAnno: (anno: string) => `Qui finisce l’anno ${anno}`,
  cominciaAnno: (anno: string) => `Qui comincia l’anno ${anno}`,

  // La striscia delle settimane
  settimaneDellAnno: (piene: number, tutte: number) =>
    `Settimane dell’anno · ${piene} su ${tutte} con lezioni`,
  icsDaGuardare: (quante: number) =>
    `ICS: ${plurale(quante, 'settimana', 'settimane')} da guardare · `,
  icsTuttoTorna: 'ICS: tutto torna · ',
  mostraSettimane: 'Mostra le settimane dell’anno',
  nascondiSettimane: 'Nascondi le settimane dell’anno',

  // L'anno
  fuoriAnno: (giorno: string) => `${giorno} · fuori dall’anno scolastico`,
  legendaChiusure: 'vacanze e chiusure',
  legendaFestivi: 'sabato e domenica',
  legendaApre: 'inizio di semestre: riga sopra',
  legendaChiude: 'fine di semestre: riga sotto',
  legendaLettera: 'A e B: la lettera della settimana, sul lunedì',
  legendaNumero: 'il numero: quanti corsi in quel giorno',
  legendaCompleanni: 'compleanni',

  // Trascinare e modificare le ore
  ancorataNonSiTrascina: 'Ancorata al calendario ICS: non si trascina.',
  ancorataFerma: 'Ancorata al calendario ICS: orario e giorno li detta il calendario della scuola.',
  /** Dove è finita un'ora: il giorno, e l'ora se c'è. */
  quando: (giorno: string, inizio: string | undefined) =>
    `${giorno}${inizio ? ` alle ${inizio}` : ''}`,
  /** «, sopra 3B, 4A»: le classi con cui l'ora si sovrappone, o niente. */
  sopra: (classi: string) => `, sopra ${classi}`,
  posata: (copia: boolean, quando: string, sopra: string) =>
    `${copia ? 'Copiata' : 'Spostata'} al ${quando}${sopra}.`,
  creata: (classe: string, giorno: string, orario: string, sopra: string) =>
    `Lezione di ${classe} il ${giorno}, ${orario}${sopra}.`,
  stirata: (classe: string, orario: string, sopra: string) =>
    `Ora di ${classe}: ${orario}${sopra}.`,
  eliminata: (classe: string) => `Lezione di ${classe} eliminata. Ctrl+Z la riporta.`,
  tiraInizio: 'Tira per cominciare prima o dopo',
  tiraFine: 'Tira per finire prima o dopo',
}

export const testi = catalogo(it, {
  de: {
    settimana: (numero) => `Woche ${numero}`,
    settimanaMinuscola: (quale) => `Woche ${quale}`,
    sigla: 'KW',
    siglaNumero: (numero) => `KW ${numero}`,
    letteraSiCambia: 'Wird in den Einstellungen geändert, mit allen Wochen in einer Reihe',
    aprila: 'öffnen',
    questaSettimana: 'diese Woche',
    nessunaLezione: 'keine Stunden',
    oggi: 'heute',
    adesso: (ora) => `jetzt, ${ora}`,

    cominciaSemestre: (etichetta) => `${etichetta} beginnt`,
    cominciaIl: (etichetta) => `${etichetta} beginnt`,
    finisceIl: (etichetta) => `${etichetta} endet`,
    fineBreve: (numero) => `Ende ${ordinaleDe(numero)}`,
    inizioBreve: (numero) => `Beginn ${ordinaleDe(numero)}`,
    primoSemestre: '1. Semester',
    secondoSemestre: '2. Semester',

    vuotoTitolo: 'Keine Stunden in diesem Jahr',
    vuotoTesto:
      'Stunden fügt man einzeln hinzu: Wiederholungen muss man keine einrichten.',
    nuovaLezione: 'Neue Stunde',

    nonInAula: 'an diesem Tag hat man keinen Unterricht mit der Klasse',

    finisceAnno: (anno) => `Hier endet das Schuljahr ${anno}`,
    cominciaAnno: (anno) => `Hier beginnt das Schuljahr ${anno}`,

    settimaneDellAnno: (piene, tutte) =>
      `Wochen des Schuljahrs · ${piene} von ${tutte} mit Stunden`,
    icsDaGuardare: (quante) => `ICS: ${plurale(quante, 'Woche', 'Wochen')} zu prüfen · `,
    icsTuttoTorna: 'ICS: alles stimmt · ',
    mostraSettimane: 'Wochen des Schuljahrs anzeigen',
    nascondiSettimane: 'Wochen des Schuljahrs ausblenden',

    fuoriAnno: (giorno) => `${giorno} · ausserhalb des Schuljahrs`,
    legendaChiusure: 'Ferien und Schliessungen',
    legendaFestivi: 'Samstag und Sonntag',
    legendaApre: 'Semesterbeginn: Linie oben',
    legendaChiude: 'Semesterende: Linie unten',
    legendaLettera: 'A und B: der Buchstabe der Woche, am Montag',
    legendaNumero: 'die Zahl: wie viele Kurse an diesem Tag',
    legendaCompleanni: 'Geburtstage',

    ancorataNonSiTrascina: 'An den ICS-Kalender gebunden: lässt sich nicht ziehen.',
    ancorataFerma: 'An den ICS-Kalender gebunden: Zeit und Tag bestimmt der Kalender der Schule.',
    quando: (giorno, inizio) => `${giorno}${inizio ? ` um ${inizio}` : ''}`,
    sopra: (classi) => `, überschneidet sich mit ${classi}`,
    posata: (copia, quando, sopra) => `${copia ? 'Kopiert' : 'Verschoben'} auf ${quando}${sopra}.`,
    creata: (classe, giorno, orario, sopra) =>
      `Stunde ${classe} am ${giorno}, ${orario}${sopra}.`,
    stirata: (classe, orario, sopra) => `Stunde ${classe}: ${orario}${sopra}.`,
    eliminata: (classe) => `Stunde ${classe} gelöscht. Ctrl+Z holt sie zurück.`,
    tiraInizio: 'Ziehen, um früher oder später zu beginnen',
    tiraFine: 'Ziehen, um früher oder später aufzuhören',
  },
  fr: {
    settimana: (numero) => `Semaine ${numero}`,
    settimanaMinuscola: (quale) => `semaine ${quale}`,
    sigla: 'sem.',
    siglaNumero: (numero) => `sem. ${numero}`,
    letteraSiCambia: 'Se change dans les Paramètres, avec toutes les semaines à la suite',
    aprila: 'l’ouvrir',
    questaSettimana: 'cette semaine',
    nessunaLezione: 'aucune leçon',
    oggi: 'aujourd’hui',
    adesso: (ora) => `maintenant, ${ora}`,

    cominciaSemestre: (etichetta) => `Début du ${etichetta}`,
    cominciaIl: (etichetta) => `début du ${etichetta}`,
    finisceIl: (etichetta) => `fin du ${etichetta}`,
    fineBreve: (numero) => `fin ${ordinaleFr(numero)}`,
    inizioBreve: (numero) => `début ${ordinaleFr(numero)}`,
    primoSemestre: '1er semestre',
    secondoSemestre: '2e semestre',

    vuotoTitolo: 'Aucune leçon dans l’année',
    vuotoTesto: 'Les leçons s’ajoutent une par une : il n’y a pas de récurrences à configurer.',
    nuovaLezione: 'Nouvelle leçon',

    nonInAula: 'ce jour-là, pas de leçon avec sa classe',

    finisceAnno: (anno) => `Ici se termine l’année ${anno}`,
    cominciaAnno: (anno) => `Ici commence l’année ${anno}`,

    settimaneDellAnno: (piene, tutte) =>
      `Semaines de l’année · ${piene} sur ${tutte} avec des leçons`,
    icsDaGuardare: (quante) => `ICS : ${plurale(quante, 'semaine', 'semaines')} à vérifier · `,
    icsTuttoTorna: 'ICS : tout concorde · ',
    mostraSettimane: 'Afficher les semaines de l’année',
    nascondiSettimane: 'Masquer les semaines de l’année',

    fuoriAnno: (giorno) => `${giorno} · hors de l’année scolaire`,
    legendaChiusure: 'vacances et fermetures',
    legendaFestivi: 'samedi et dimanche',
    legendaApre: 'début de semestre : trait en haut',
    legendaChiude: 'fin de semestre : trait en bas',
    legendaLettera: 'A et B : la lettre de la semaine, sur le lundi',
    legendaNumero: 'le nombre : combien de cours ce jour-là',
    legendaCompleanni: 'anniversaires',

    ancorataNonSiTrascina: 'Ancrée au calendrier ICS : elle ne se déplace pas.',
    ancorataFerma:
      'Ancrée au calendrier ICS : l’horaire et le jour sont fixés par le calendrier de l’école.',
    quando: (giorno, inizio) => `${giorno}${inizio ? ` à ${inizio}` : ''}`,
    sopra: (classi) => `, en même temps que ${classi}`,
    posata: (copia, quando, sopra) => `${copia ? 'Copiée' : 'Déplacée'} au ${quando}${sopra}.`,
    creata: (classe, giorno, orario, sopra) =>
      `Leçon de ${classe} le ${giorno}, ${orario}${sopra}.`,
    stirata: (classe, orario, sopra) => `Leçon de ${classe} : ${orario}${sopra}.`,
    eliminata: (classe) => `Leçon de ${classe} supprimée. Ctrl+Z la rétablit.`,
    tiraInizio: 'Tirer pour commencer plus tôt ou plus tard',
    tiraFine: 'Tirer pour finir plus tôt ou plus tard',
  },
  en: {
    settimana: (numero) => `Week ${numero}`,
    settimanaMinuscola: (quale) => `week ${quale}`,
    sigla: 'wk',
    siglaNumero: (numero) => `wk ${numero}`,
    letteraSiCambia: 'Changed in Settings, with all the weeks in a row',
    aprila: 'open it',
    questaSettimana: 'this week',
    nessunaLezione: 'no lessons',
    oggi: 'today',
    adesso: (ora) => `now, ${ora}`,

    cominciaSemestre: (etichetta) => `${etichetta} begins`,
    cominciaIl: (etichetta) => `${etichetta} begins`,
    finisceIl: (etichetta) => `${etichetta} ends`,
    fineBreve: (numero) => `end ${ordinaleEn(numero)}`,
    inizioBreve: (numero) => `start ${ordinaleEn(numero)}`,
    primoSemestre: '1st semester',
    secondoSemestre: '2nd semester',

    vuotoTitolo: 'No lessons this year',
    vuotoTesto: 'Lessons are added one by one: there are no recurrences to set up.',
    nuovaLezione: 'New lesson',

    nonInAula: 'no lesson with their class that day',

    finisceAnno: (anno) => `The ${anno} year ends here`,
    cominciaAnno: (anno) => `The ${anno} year begins here`,

    settimaneDellAnno: (piene, tutte) => `Weeks of the year · ${piene} of ${tutte} with lessons`,
    icsDaGuardare: (quante) => `ICS: ${plurale(quante, 'week', 'weeks')} to check · `,
    icsTuttoTorna: 'ICS: everything matches · ',
    mostraSettimane: 'Show the weeks of the year',
    nascondiSettimane: 'Hide the weeks of the year',

    fuoriAnno: (giorno) => `${giorno} · outside the school year`,
    legendaChiusure: 'holidays and closures',
    legendaFestivi: 'Saturday and Sunday',
    legendaApre: 'start of semester: line above',
    legendaChiude: 'end of semester: line below',
    legendaLettera: 'A and B: the week’s letter, on the Monday',
    legendaNumero: 'the number: how many courses that day',
    legendaCompleanni: 'birthdays',

    ancorataNonSiTrascina: 'Anchored to the ICS calendar: it can’t be dragged.',
    ancorataFerma: 'Anchored to the ICS calendar: the school calendar sets its time and day.',
    quando: (giorno, inizio) => `${giorno}${inizio ? ` at ${inizio}` : ''}`,
    sopra: (classi) => `, overlapping ${classi}`,
    posata: (copia, quando, sopra) => `${copia ? 'Copied' : 'Moved'} to ${quando}${sopra}.`,
    creata: (classe, giorno, orario, sopra) => `${classe} lesson on ${giorno}, ${orario}${sopra}.`,
    stirata: (classe, orario, sopra) => `${classe} lesson: ${orario}${sopra}.`,
    eliminata: (classe) => `${classe} lesson deleted. Ctrl+Z brings it back.`,
    tiraInizio: 'Drag to start earlier or later',
    tiraFine: 'Drag to finish earlier or later',
  },
})

// I testi della Dashboard (`today.ts`). I nomi delle pagine a cui portano le
// tessere vengono da `pages.testi.ts`, così coincidono con la barra laterale.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  titolo: 'Dashboard',
  /** Il saluto, secondo l'ora: la prima riga della testata. */
  saluto: (ora: string) =>
    ora < '12:00'
      ? 'Buongiorno'
      : ora < '18:00'
        ? 'Buon pomeriggio'
        : 'Buonasera',
  /** Il sottotitolo: il saluto e la data lunga, nella lingua di adesso. */
  sottotitolo: (saluto: string, data: string) => `${saluto} — oggi è ${data}.`,
  prossimaGiornata: (data: string) => `Prossima giornata di lezione: ${data}.`,

  // --------------------------------------------------------------- le tessere
  tessere: 'Il giorno in cifre',
  oreDiOggi: 'Lezioni di oggi',
  oreDellaGiornata: 'Lezioni della prossima giornata',
  nessunaOraOggi: 'Nessuna in calendario',
  prossimaAlle: (ora: string) => `La prossima alle ${ora}`,
  inCorsoFinoAlle: (ora: string) => `In corso fino alle ${ora}`,
  tutteFatte: 'Per oggi è tutto',
  daCompilare: 'Da compilare',
  inPari: 'Il registro è in pari',
  laPiuVecchia: (data: string) => `La più vecchia: ${data}`,
  urgenti: (n: number) =>
    n === 0 ? 'Nessuna urgente' : plurale(n, 'urgente', 'urgenti'),
  pagineInAttesa: (n: number) =>
    n === 0
      ? 'Niente in attesa'
      : `${plurale(n, 'pagina', 'pagine')} in attesa`,
  /** Che cosa fa una tessera, detto a chi la legge a voce o si ferma sopra. */
  portaA: (pagina: string) => `Apri «${pagina}»`,

  // ------------------------------------------------------------ le ore di oggi
  leOreDiOggi: 'Le lezioni di oggi',
  leOreDellaGiornata: 'Le lezioni della prossima giornata',
  quanteOre: (n: number, dalle: string, alle: string) =>
    `${plurale(n, 'lezione', 'lezioni')}, dalle ${dalle} alle ${alle}`,
  nienteOggi: 'Oggi niente lezioni',
  nienteOggiTesto:
    'Il calendario non ha lezioni per oggi: quelle dei prossimi giorni sono nel calendario.',
  adesso: 'Adesso',
  prossima: 'Prossima',
  apriLOra: (classe: string, inizio: string) =>
    `Apri la lezione di ${classe} delle ${inizio}`,
  /** Le fasi di un'ora, dette su una pastiglia (vedi `faseDellOra`). */
  fasi: {
    'in-corso': 'In corso',
    'da-chiudere': 'Da chiudere',
    svolta: 'Svolta',
    'da-preparare': 'Da preparare',
    futura: 'In programma',
    annullata: 'Annullata',
  },
  /** Il nome dell'elenco per l'assistente: «12 ore di oggi». */
  oreDiOggiMinuscolo: 'lezioni di oggi',

  // ------------------------------------------------------ prossime valutazioni
  prossimeValutazioni: 'Prossime valutazioni',
  nessunaValutazione: 'Nessuna valutazione in vista',
  nessunaValutazioneTesto:
    'Quando ne metti una in calendario, compare qui con i giorni che mancano.',
  fra: (giorni: number) =>
    giorni === 0 ? 'oggi' : giorni === 1 ? 'domani' : `fra ${giorni} giorni`,
  apriValutazione: (titolo: string) => `Apri la valutazione «${titolo}»`,

  // -------------------------------------------------------------- compleanni
  compleanni: 'Compleanni di oggi',
  compleanniDellaGiornata: 'Compleanni della giornata',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Dashboard',
    saluto: (ora) =>
      ora < '12:00'
        ? 'Guten Morgen'
        : ora < '18:00'
          ? 'Guten Tag'
          : 'Guten Abend',
    sottotitolo: (saluto, data) => `${saluto} — heute ist ${data}.`,
    prossimaGiornata: (data) => `Nächster Unterrichtstag: ${data}.`,
    tessere: 'Der Tag in Zahlen',
    oreDiOggi: 'Stunden heute',
    oreDellaGiornata: 'Stunden am nächsten Unterrichtstag',
    nessunaOraOggi: 'Keine im Kalender',
    prossimaAlle: (ora) => `Die nächste um ${ora}`,
    inCorsoFinoAlle: (ora) => `Läuft bis ${ora}`,
    tutteFatte: 'Für heute ist alles erledigt',
    daCompilare: 'Nachzutragen',
    inPari: 'Das Klassenbuch ist nachgeführt',
    laPiuVecchia: (data) => `Die älteste: ${data}`,
    urgenti: (n) => (n === 0 ? 'Keine dringend' : `${n} dringend`),
    pagineInAttesa: (n) =>
      n === 0
        ? 'Nichts wartet'
        : `${plurale(n, 'Seite wartet', 'Seiten warten')}`,
    portaA: (pagina) => `«${pagina}» öffnen`,
    leOreDiOggi: 'Die Stunden von heute',
    leOreDellaGiornata: 'Stunden am nächsten Unterrichtstag',
    quanteOre: (n, dalle, alle) =>
      `${plurale(n, 'Stunde', 'Stunden')}, von ${dalle} bis ${alle}`,
    nienteOggi: 'Heute kein Unterricht',
    nienteOggiTesto:
      'Der Kalender hat für heute keine Stunden: die der nächsten Tage findest du im Kalender.',
    adesso: 'Jetzt',
    prossima: 'Als Nächstes',
    apriLOra: (classe, inizio) =>
      `Die Stunde der ${classe} um ${inizio} öffnen`,
    fasi: {
      'in-corso': 'Läuft',
      'da-chiudere': 'Abzuschliessen',
      svolta: 'Gehalten',
      'da-preparare': 'Vorzubereiten',
      futura: 'Geplant',
      annullata: 'Ausgefallen',
    },
    oreDiOggiMinuscolo: 'Stunden von heute',
    prossimeValutazioni: 'Nächste Beurteilungen',
    nessunaValutazione: 'Keine Beurteilung in Sicht',
    nessunaValutazioneTesto:
      'Sobald du eine in den Kalender setzt, erscheint sie hier mit den Tagen, die noch bleiben.',
    fra: (giorni) =>
      giorni === 0 ? 'heute' : giorni === 1 ? 'morgen' : `in ${giorni} Tagen`,
    apriValutazione: (titolo) => `Beurteilung «${titolo}» öffnen`,
    compleanni: 'Geburtstage heute',
    compleanniDellaGiornata: 'Geburtstage am Unterrichtstag',
  },
  fr: {
    titolo: 'Tableau de bord',
    saluto: (ora) =>
      ora < '12:00' ? 'Bonjour' : ora < '18:00' ? 'Bon après-midi' : 'Bonsoir',
    sottotitolo: (saluto, data) => `${saluto} — nous sommes le ${data}.`,
    prossimaGiornata: (data) => `Prochaine journée de cours : ${data}.`,
    tessere: 'La journée en chiffres',
    oreDiOggi: 'Leçons du jour',
    oreDellaGiornata: 'Leçons de la prochaine journée',
    nessunaOraOggi: 'Aucune au calendrier',
    prossimaAlle: (ora) => `La prochaine à ${ora}`,
    inCorsoFinoAlle: (ora) => `En cours jusqu’à ${ora}`,
    tutteFatte: 'C’est tout pour aujourd’hui',
    daCompilare: 'À compléter',
    inPari: 'Le registre est à jour',
    laPiuVecchia: (data) => `La plus ancienne : ${data}`,
    urgenti: (n) =>
      n === 0 ? 'Aucune urgente' : plurale(n, 'urgente', 'urgentes'),
    pagineInAttesa: (n) =>
      n === 0 ? 'Rien en attente' : `${plurale(n, 'page', 'pages')} en attente`,
    portaA: (pagina) => `Ouvrir « ${pagina} »`,
    leOreDiOggi: 'Les leçons d’aujourd’hui',
    leOreDellaGiornata: 'Les leçons de la prochaine journée',
    quanteOre: (n, dalle, alle) =>
      `${plurale(n, 'leçon', 'leçons')}, de ${dalle} à ${alle}`,
    nienteOggi: 'Pas de leçons aujourd’hui',
    nienteOggiTesto:
      'Le calendrier n’a aucune leçon aujourd’hui : celles des prochains jours sont au calendrier.',
    adesso: 'Maintenant',
    prossima: 'Ensuite',
    apriLOra: (classe, inizio) => `Ouvrir la leçon de ${classe} à ${inizio}`,
    fasi: {
      'in-corso': 'En cours',
      'da-chiudere': 'À clôturer',
      svolta: 'Donnée',
      'da-preparare': 'À préparer',
      futura: 'Prévue',
      annullata: 'Annulée',
    },
    oreDiOggiMinuscolo: 'leçons du jour',
    prossimeValutazioni: 'Prochaines évaluations',
    nessunaValutazione: 'Aucune évaluation en vue',
    nessunaValutazioneTesto:
      'Dès que tu en mets une au calendrier, elle apparaît ici avec les jours qui restent.',
    fra: (giorni) =>
      giorni === 0
        ? 'aujourd’hui'
        : giorni === 1
          ? 'demain'
          : `dans ${giorni} jours`,
    apriValutazione: (titolo) => `Ouvrir l’évaluation « ${titolo} »`,
    compleanni: 'Anniversaires du jour',
    compleanniDellaGiornata: 'Anniversaires de la journée',
  },
  en: {
    titolo: 'Dashboard',
    saluto: (ora) =>
      ora < '12:00'
        ? 'Good morning'
        : ora < '18:00'
          ? 'Good afternoon'
          : 'Good evening',
    sottotitolo: (saluto, data) => `${saluto} — today is ${data}.`,
    prossimaGiornata: (data) => `Next teaching day: ${data}.`,
    tessere: 'The day in numbers',
    oreDiOggi: 'Lessons today',
    oreDellaGiornata: 'Lessons on the next teaching day',
    nessunaOraOggi: 'None in the calendar',
    prossimaAlle: (ora) => `Next at ${ora}`,
    inCorsoFinoAlle: (ora) => `In progress until ${ora}`,
    tutteFatte: 'That’s all for today',
    daCompilare: 'To fill in',
    inPari: 'The register is up to date',
    laPiuVecchia: (data) => `Oldest: ${data}`,
    urgenti: (n) => (n === 0 ? 'None urgent' : `${n} urgent`),
    pagineInAttesa: (n) =>
      n === 0 ? 'Nothing waiting' : `${plurale(n, 'page', 'pages')} waiting`,
    portaA: (pagina) => `Open “${pagina}”`,
    leOreDiOggi: 'Today’s lessons',
    leOreDellaGiornata: 'Lessons on the next teaching day',
    quanteOre: (n, dalle, alle) =>
      `${plurale(n, 'lesson', 'lessons')}, from ${dalle} to ${alle}`,
    nienteOggi: 'No lessons today',
    nienteOggiTesto:
      'The calendar has no lessons for today: the coming days are in the calendar.',
    adesso: 'Now',
    prossima: 'Next',
    apriLOra: (classe, inizio) => `Open the ${classe} lesson at ${inizio}`,
    fasi: {
      'in-corso': 'In progress',
      'da-chiudere': 'To close',
      svolta: 'Held',
      'da-preparare': 'To prepare',
      futura: 'Planned',
      annullata: 'Cancelled',
    },
    oreDiOggiMinuscolo: 'lessons today',
    prossimeValutazioni: 'Upcoming assessments',
    nessunaValutazione: 'No assessments coming up',
    nessunaValutazioneTesto:
      'When you put one in the calendar, it shows up here with the days left.',
    fra: (giorni) =>
      giorni === 0 ? 'today' : giorni === 1 ? 'tomorrow' : `in ${giorni} days`,
    apriValutazione: (titolo) => `Open the assessment “${titolo}”`,
    compleanni: 'Birthdays today',
    compleanniDellaGiornata: 'Birthdays on that day',
  },
})

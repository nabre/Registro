// Giorni, mesi, semestri e anno intero. Scritti a mano e non presi da `Intl` perché
// servono abbreviazioni senza punto per caselle di tre lettere («lun», «Mo»,
// «lu») e iniziali di una lettera per il calendario annuale.

import { catalogo } from '#core/i18n/index.js'

const it = {
  giorniBrevi: ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'],
  /** Tre lettere in ogni lingua, per l'etichetta di una lezione: «GIO 01.10.2026». */
  giorniTreLettere: ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'],
  giorniLunghi: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
  mesi: [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
  ],
  inizialiGiorno: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  /** Come si chiama il periodo quando non c'è un semestre: l'anno intero. */
  annoIntero: 'anno intero',
  /** Il nome di un semestre, «1° semestre», e il suo diminutivo, «1° sem.». */
  semestre: (numero: number) => `${numero}° semestre`,
  semestreBreve: (numero: number) => `${numero}° sem.`,
  /** La sigla dell'unità didattica dopo un numero: «1¼ UD». */
  ud: 'UD',
  /** La data per intero: «lunedì 7 settembre 2026». */
  dataLunga: (giorno: string, numero: number, mese: string, anno: number) =>
    `${giorno} ${numero} ${mese} ${anno}`,
}

export const testi = catalogo(it, {
  de: {
    giorniBrevi: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    giorniTreLettere: ['Mon', 'Die', 'Mit', 'Don', 'Fre', 'Sam', 'Son'],
    giorniLunghi: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
    mesi: [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
    ],
    inizialiGiorno: ['M', 'D', 'M', 'D', 'F', 'S', 'S'],
    annoIntero: 'ganzes Jahr',
    semestre: (numero) => `${numero}. Semester`,
    semestreBreve: (numero) => `${numero}. Sem.`,
    ud: 'Lekt.',
    dataLunga: (giorno, numero, mese, anno) => `${giorno}, ${numero}. ${mese} ${anno}`,
  },
  fr: {
    giorniBrevi: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'],
    giorniTreLettere: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'],
    giorniLunghi: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
    mesi: [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ],
    inizialiGiorno: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    annoIntero: 'année entière',
    semestre: (numero) => `${numero}${numero === 1 ? 'er' : 'e'} semestre`,
    semestreBreve: (numero) => `${numero}${numero === 1 ? 'er' : 'e'} sem.`,
    ud: 'pér.',
    dataLunga: (giorno, numero, mese, anno) => `${giorno} ${numero} ${mese} ${anno}`,
  },
  en: {
    giorniBrevi: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    giorniTreLettere: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    giorniLunghi: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    mesi: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    inizialiGiorno: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    annoIntero: 'whole year',
    semestre: (numero) => `Semester ${numero}`,
    semestreBreve: (numero) => `Sem. ${numero}`,
    ud: 'per.',
    dataLunga: (giorno, numero, mese, anno) => `${giorno} ${numero} ${mese} ${anno}`,
  },
})

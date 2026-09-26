// I testi della pagina del calendario (`calendar.ts`).

import { catalogo, perNumero } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  titolo: 'Calendario',
  vuoto: 'Il registro comincia da qui.',
  /** Il sottotitolo della settimana: le date e il suo numero. */
  settimana: (dal: string, al: string, numero: number) => `${dal} – ${al} · settimana ${numero}`,
  guastoIcs: (dove: string, guasto: string) => `${dove} · calendario ICS: ${guasto}`,
  inChiusura: (quante: number, nomi: string) =>
    `${plurale(quante, 'ora cade', 'ore cadono')} in un giorno di chiusura (${nomi}).`,
  rimuovi: 'Rimuovi le ore nelle vacanze',
  togliereTitolo: (quante: number) =>
    `Togliere ${perNumero(quante, 'l’ora', `le ${quante} ore`)} nei giorni di chiusura?`,
  conDati: (quante: number) =>
    `${plurale(quante, 'ha', 'hanno')} già l’appello o uno stato: si perdono. `,
  restano: 'Valutazioni, consegne e spunte legate restano, senza la lezione. Ctrl+Z le riporta.',
  /** Il nome del pulsante che accende la modifica, fra le virgolette. */
  inModifica: (pulsante: string) => ` In «${pulsante}» si tolgono con un clic.`,
  lezioniSettimana: 'lezioni in settimana',
  udSettimana: 'UD in settimana',
  oreEffettive: 'ore effettive',
  daSvolgere: 'da svolgere',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Kalender',
    vuoto: 'Hier beginnt das Klassenbuch.',
    settimana: (dal, al, numero) => `${dal} – ${al} · Woche ${numero}`,
    guastoIcs: (dove, guasto) => `${dove} · ICS-Kalender: ${guasto}`,
    inChiusura: (quante, nomi) =>
      `${plurale(quante, 'Stunde fällt', 'Stunden fallen')} auf einen Schliessungstag (${nomi}).`,
    rimuovi: 'Stunden in den Ferien entfernen',
    togliereTitolo: (quante) =>
      `${perNumero(quante, 'Die Stunde', `Die ${quante} Stunden`)} an Schliessungstagen entfernen?`,
    conDati: (quante) =>
      `${perNumero(quante, 'Eine hat', `${quante} haben`)} schon eine Präsenzkontrolle ` +
      'oder einen Status: Das geht verloren. ',
    restano:
      'Beurteilungen, Aufträge und verknüpfte Häkchen bleiben, ohne die Stunde. ' +
      'Ctrl+Z holt sie zurück.',
    inModifica: (pulsante) => ` Unter «${pulsante}» entfernt man sie mit einem Klick.`,
    lezioniSettimana: 'Stunden diese Woche',
    udSettimana: 'Lektionen diese Woche',
    oreEffettive: 'effektive Zeitstunden',
    daSvolgere: 'noch zu halten',
  },
  fr: {
    titolo: 'Calendrier',
    vuoto: 'Le registre commence ici.',
    settimana: (dal, al, numero) => `${dal} – ${al} · semaine ${numero}`,
    guastoIcs: (dove, guasto) => `${dove} · calendrier ICS : ${guasto}`,
    inChiusura: (quante, nomi) =>
      `${plurale(quante, 'leçon tombe', 'leçons tombent')} un jour de fermeture (${nomi}).`,
    rimuovi: 'Retirer les leçons pendant les vacances',
    togliereTitolo: (quante) =>
      `Retirer ${perNumero(quante, 'la leçon', `les ${quante} leçons`)} des jours de fermeture ?`,
    conDati: (quante) =>
      `${perNumero(quante, 'Une a', `${quante} ont`)} déjà l’appel ou un état : ` +
      'ils seront perdus. ',
    restano:
      'Les évaluations, devoirs et coches liés restent, sans la leçon. Ctrl+Z les rétablit.',
    inModifica: (pulsante) => ` En mode « ${pulsante} », on les retire d’un clic.`,
    lezioniSettimana: 'leçons cette semaine',
    udSettimana: 'périodes cette semaine',
    oreEffettive: 'heures effectives',
    daSvolgere: 'à donner',
  },
  en: {
    titolo: 'Calendar',
    vuoto: 'The register starts here.',
    settimana: (dal, al, numero) => `${dal} – ${al} · week ${numero}`,
    guastoIcs: (dove, guasto) => `${dove} · ICS calendar: ${guasto}`,
    inChiusura: (quante, nomi) =>
      `${plurale(quante, 'lesson falls', 'lessons fall')} on a closure day (${nomi}).`,
    rimuovi: 'Remove the lessons in the holidays',
    togliereTitolo: (quante) =>
      `Remove ${perNumero(quante, 'the lesson', `the ${quante} lessons`)} on closure days?`,
    conDati: (quante) =>
      `${perNumero(quante, 'One already has', `${quante} already have`)} attendance recorded ` +
      'or a status: that will be lost. ',
    restano:
      'Linked assessments, assignments and ticks stay, without the lesson. Ctrl+Z brings ' +
      'them back.',
    inModifica: (pulsante) => ` In “${pulsante}” mode they go with one click.`,
    lezioniSettimana: 'lessons this week',
    udSettimana: 'periods this week',
    oreEffettive: 'actual hours',
    daSvolgere: 'still to be held',
  },
})

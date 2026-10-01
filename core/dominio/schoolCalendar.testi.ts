// I testi di `schoolCalendar.ts`: le due voci del calendario scolastico che
// non vengono dal cantone ma dal registro — dove l'anno comincia e dove finisce
// — e i rifiuti di chi tocca un anno che segue il calendario ufficiale.

import { catalogo } from '#core/i18n/index.js'

const it = {
  inizioLezioni: 'Inizio delle lezioni',
  fineLezioni: 'Fine delle lezioni',
  marcatoreToccato:
    'Se l’anno segue il calendario ufficiale non si decide salvandolo: si collega o si stacca ' +
    'dalle impostazioni dell’anno.',
  calendarioSconosciuto: (cantone: string, anno: string) =>
    `Il calendario ufficiale ${cantone} ${anno} non c’è in questa versione del registro.`,
  dataBloccata: (quale: string) =>
    `${quale} viene dal calendario ufficiale: per cambiare la data stacca prima l’anno dal calendario.`,
  chiusuraBloccata: (nome: string) =>
    `«${nome}» viene dal calendario ufficiale e non si toglie né si cambia: ` +
    'per farlo stacca prima l’anno dal calendario.',
  chiusuraInventata: (nome: string) =>
    `«${nome}» si presenta come una chiusura del calendario ufficiale, ma il calendario non ` +
    'la porta così.',
  chiusuraMancante: (nome: string) =>
    `Un anno che segue il calendario ufficiale nasce con tutte le sue chiusure: manca «${nome}».`,
}

export const testi = catalogo(it, {
  de: {
    inizioLezioni: 'Unterrichtsbeginn',
    fineLezioni: 'Unterrichtsende',
    marcatoreToccato:
      'Ob das Schuljahr dem offiziellen Kalender folgt, entscheidet nicht das Speichern: ' +
      'verknüpft oder gelöst wird es in den Einstellungen des Schuljahrs.',
    calendarioSconosciuto: (cantone, anno) =>
      `Den offiziellen Kalender ${cantone} ${anno} gibt es in dieser Version des Klassenbuchs nicht.`,
    dataBloccata: (quale) =>
      `${quale} stammt aus dem offiziellen Kalender: Um das Datum zu ändern, löse das Schuljahr ` +
      'zuerst vom Kalender.',
    chiusuraBloccata: (nome) =>
      `«${nome}» stammt aus dem offiziellen Kalender und lässt sich weder entfernen noch ändern: ` +
      'Löse dazu das Schuljahr zuerst vom Kalender.',
    chiusuraInventata: (nome) =>
      `«${nome}» gibt sich als Schliessung des offiziellen Kalenders aus, aber der Kalender ` +
      'führt sie nicht so.',
    chiusuraMancante: (nome) =>
      `Ein Schuljahr nach dem offiziellen Kalender beginnt mit allen seinen Schliessungen: «${nome}» fehlt.`,
  },
  fr: {
    inizioLezioni: 'Début des cours',
    fineLezioni: 'Fin des cours',
    marcatoreToccato:
      'Suivre ou non le calendrier officiel ne se décide pas en enregistrant l’année : on la lie ' +
      'ou on la détache dans les réglages de l’année.',
    calendarioSconosciuto: (cantone, anno) =>
      `Le calendrier officiel ${cantone} ${anno} n’est pas dans cette version du registre.`,
    dataBloccata: (quale) =>
      `${quale} vient du calendrier officiel : pour changer la date, détache d’abord l’année du ` +
      'calendrier.',
    chiusuraBloccata: (nome) =>
      `« ${nome} » vient du calendrier officiel et ne se supprime ni ne se modifie : ` +
      'pour cela, détache d’abord l’année du calendrier.',
    chiusuraInventata: (nome) =>
      `« ${nome} » se présente comme une fermeture du calendrier officiel, mais le calendrier ` +
      'ne la prévoit pas ainsi.',
    chiusuraMancante: (nome) =>
      `Une année qui suit le calendrier officiel naît avec toutes ses fermetures : il manque « ${nome} ».`,
  },
  en: {
    inizioLezioni: 'Start of lessons',
    fineLezioni: 'End of lessons',
    marcatoreToccato:
      'Whether the year follows the official calendar isn’t decided by saving it: link or ' +
      'unlink it in the year’s settings.',
    calendarioSconosciuto: (cantone, anno) =>
      `The official calendar ${cantone} ${anno} isn’t in this version of the register.`,
    dataBloccata: (quale) =>
      `${quale} comes from the official calendar: to change it, unlink the year from the ` +
      'calendar first.',
    chiusuraBloccata: (nome) =>
      `“${nome}” comes from the official calendar and can’t be removed or changed: ` +
      'unlink the year from the calendar first.',
    chiusuraInventata: (nome) =>
      `“${nome}” claims to be a closure of the official calendar, but the calendar doesn’t ` +
      'have it like that.',
    chiusuraMancante: (nome) =>
      `A year that follows the official calendar starts with all its closures: “${nome}” is missing.`,
  },
})

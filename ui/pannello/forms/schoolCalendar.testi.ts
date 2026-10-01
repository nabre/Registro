// I testi di `forms/schoolCalendar.ts`: il calendario scolastico ufficiale
// dentro i moduli dell'anno.
//
// Il nome del Cantone arriva dai dati, scritto in italiano: le lingue che lo
// chiamano in un altro modo lo rinominano qui.

import { catalogo } from '#core/i18n/index.js'
import { plurale } from '#core/dominio/text.js'

/** Il Ticino come lo si chiama a nord delle Alpi. */
const tessin = (cantone: string): string => (cantone === 'Ticino' ? 'Tessin' : cantone)

const it = {
  daAggiungere: 'da aggiungere',
  giaCe: (etichetta: string) => `già c’è come «${etichetta}»: si collega`,
  ora: (quando: string) => `ora ${quando}`,
  nome: (cantone: string) => `Calendario scolastico del ${cantone}`,
  nonCeAncora: (nome: string, inizio: string) =>
    `${nome}: l’anno che comincia il ${inizio} ` +
    'non c’è ancora in questa versione del registro.',
  allineato: (fonte: string, voci: number) =>
    `${fonte}: l’anno è allineato (${plurale(voci, 'voce', 'voci')}).`,
  daFare: (fonte: string, voci: number, allineate: number) =>
    `${fonte}: ${plurale(voci, 'voce', 'voci')} che l’anno non ha così` +
    (allineate > 0 ? `, ${plurale(allineate, 'altra', 'altre')} già a posto.` : '.'),
  importa: 'Importa le voci scelte',
  aMano: 'date scritte a mano',
  dalCalendario: (cantone: string) => `dal calendario del ${cantone}: date, vacanze e festivi`,
  fonte: (cantone: string, anno: string) => `${cantone} ${anno}`,
  dalCalendarioUfficiale: (fonte: string) => `Dal calendario ufficiale · ${fonte}`,
  chiusuraUfficiale: 'ufficiale',
  segue: (fonte: string) =>
    `L’anno segue il calendario ufficiale ${fonte}: inizio, fine e chiusure ufficiali ` +
    'non si cambiano a mano. Le chiusure proprie si aggiungono e si tolgono come sempre.',
  seguira: (fonte: string) =>
    `L’anno seguirà il calendario ufficiale ${fonte}: inizio, fine e chiusure ufficiali ` +
    'restano bloccati. Per scriverli a mano scegli «date scritte a mano» in cima.',
  daRiallineare: (voci: number) =>
    `Questa versione del registro ha il calendario aggiornato: ${plurale(voci, 'voce', 'voci')} ` +
    'da riallineare.',
  riallinea: 'Riallinea al calendario',
  stacca: 'Stacca dal calendario ufficiale',
  staccaTitolo: 'Staccare l’anno dal calendario ufficiale?',
  staccaTesto:
    'Date e chiusure restano come sono, ma da qui in poi si cambiano a mano e il registro non ' +
    'le tiene più allineate al calendario.',
  collega: 'Collega al calendario ufficiale',
  collegaAiuto:
    'Collegato, l’anno prende inizio, fine e chiusure dal calendario e non li lascia cambiare ' +
    'per sbaglio.',
  collegaTitolo: (fonte: string) => `Collegare l’anno al calendario ufficiale ${fonte}?`,
  collegaTesto: (riconosciute: number) =>
    'Inizio, fine e chiusure diventano quelle ufficiali e non si cambiano più a mano; le ' +
    'chiusure proprie restano.' +
    (riconosciute > 0
      ? ` ${plurale(riconosciute, 'chiusura scritta', 'chiusure scritte')} a mano ` +
        `${riconosciute === 1 ? 'coincide' : 'coincidono'} con il calendario: ` +
        `${riconosciute === 1 ? 'diventa collegata e bloccata' : 'diventano collegate e bloccate'}.`
      : ''),
}

export const testi = catalogo(it, {
  de: {
    daAggiungere: 'neu',
    giaCe: (etichetta) => `schon vorhanden als «${etichetta}»: wird verknüpft`,
    ora: (quando) => `jetzt ${quando}`,
    nome: (cantone) => `Schulkalender des Kantons ${tessin(cantone)}`,
    nonCeAncora: (nome, inizio) =>
      `${nome}: Das Schuljahr ab ${inizio} ist in dieser Version des Klassenbuchs ` +
      'noch nicht enthalten.',
    allineato: (fonte, voci) =>
      `${fonte}: Das Schuljahr stimmt überein (${plurale(voci, 'Eintrag', 'Einträge')}).`,
    daFare: (fonte, voci, allineate) =>
      `${fonte}: ${plurale(voci, 'Eintrag', 'Einträge')}, die das Schuljahr so nicht hat` +
      (allineate > 0 ? `, ${plurale(allineate, 'weiterer', 'weitere')} schon in Ordnung.` : '.'),
    importa: 'Gewählte Einträge importieren',
    aMano: 'Daten von Hand eingegeben',
    dalCalendario: (cantone) =>
      `aus dem Schulkalender des Kantons ${tessin(cantone)}: Daten, Ferien und Feiertage`,
    fonte: (cantone, anno) => `${tessin(cantone)} ${anno}`,
    dalCalendarioUfficiale: (fonte) => `Aus dem offiziellen Kalender · ${fonte}`,
    chiusuraUfficiale: 'offiziell',
    segue: (fonte) =>
      `Das Schuljahr folgt dem offiziellen Kalender ${fonte}: Beginn, Ende und offizielle ` +
      'Schliessungen lassen sich nicht von Hand ändern. Eigene Schliessungen fügst du wie ' +
      'immer hinzu oder entfernst sie.',
    seguira: (fonte) =>
      `Das Schuljahr wird dem offiziellen Kalender ${fonte} folgen: Beginn, Ende und offizielle ` +
      'Schliessungen bleiben gesperrt. Um sie von Hand einzugeben, wähle oben «Daten von Hand ' +
      'eingegeben».',
    daRiallineare: (voci) =>
      'Diese Version des Klassenbuchs hat einen aktualisierten Kalender: ' +
      `${plurale(voci, 'Eintrag', 'Einträge')} anzugleichen.`,
    riallinea: 'An den Kalender angleichen',
    stacca: 'Vom offiziellen Kalender lösen',
    staccaTitolo: 'Das Schuljahr vom offiziellen Kalender lösen?',
    staccaTesto:
      'Daten und Schliessungen bleiben, wie sie sind, werden ab jetzt aber von Hand geändert, ' +
      'und das Klassenbuch hält sie nicht mehr mit dem Kalender übereinstimmend.',
    collega: 'Mit dem offiziellen Kalender verknüpfen',
    collegaAiuto:
      'Verknüpft übernimmt das Schuljahr Beginn, Ende und Schliessungen aus dem Kalender und ' +
      'lässt sie nicht versehentlich ändern.',
    collegaTitolo: (fonte) => `Das Schuljahr mit dem offiziellen Kalender ${fonte} verknüpfen?`,
    collegaTesto: (riconosciute) =>
      'Beginn, Ende und Schliessungen werden die offiziellen und lassen sich nicht mehr von Hand ' +
      'ändern; eigene Schliessungen bleiben.' +
      (riconosciute > 0
        ? ` ${plurale(riconosciute, 'von Hand erfasste Schliessung', 'von Hand erfasste Schliessungen')} ` +
          `${riconosciute === 1 ? 'stimmt' : 'stimmen'} mit dem Kalender überein und ` +
          `${riconosciute === 1 ? 'wird' : 'werden'} verknüpft und gesperrt.`
        : ''),
  },
  fr: {
    daAggiungere: 'à ajouter',
    giaCe: (etichetta) => `existe déjà comme « ${etichetta} » : sera lié`,
    ora: (quando) => `actuellement ${quando}`,
    nome: (cantone) => `Calendrier scolaire du ${tessin(cantone)}`,
    nonCeAncora: (nome, inizio) =>
      `${nome} : l’année qui commence le ${inizio} ` +
      'n’est pas encore dans cette version du registre.',
    allineato: (fonte, voci) =>
      `${fonte} : l’année est alignée (${plurale(voci, 'entrée', 'entrées')}).`,
    daFare: (fonte, voci, allineate) =>
      `${fonte} : ${plurale(voci, 'entrée', 'entrées')} que l’année n’a pas sous cette forme` +
      (allineate > 0 ? `, ${plurale(allineate, 'autre', 'autres')} déjà en ordre.` : '.'),
    importa: 'Importer les entrées choisies',
    aMano: 'dates saisies à la main',
    dalCalendario: (cantone) =>
      `du calendrier du ${tessin(cantone)} : dates, vacances et jours fériés`,
    fonte: (cantone, anno) => `${tessin(cantone)} ${anno}`,
    dalCalendarioUfficiale: (fonte) => `Du calendrier officiel · ${fonte}`,
    chiusuraUfficiale: 'officielle',
    segue: (fonte) =>
      `L’année suit le calendrier officiel ${fonte} : début, fin et fermetures officielles ne ` +
      'se changent pas à la main. Les fermetures propres s’ajoutent et se retirent comme ' +
      'toujours.',
    seguira: (fonte) =>
      `L’année suivra le calendrier officiel ${fonte} : début, fin et fermetures officielles ` +
      'restent verrouillés. Pour les saisir à la main, choisis « dates saisies à la main » en haut.',
    daRiallineare: (voci) =>
      'Cette version du registre a un calendrier mis à jour : ' +
      `${plurale(voci, 'entrée', 'entrées')} à réaligner.`,
    riallinea: 'Réaligner sur le calendrier',
    stacca: 'Détacher du calendrier officiel',
    staccaTitolo: 'Détacher l’année du calendrier officiel ?',
    staccaTesto:
      'Dates et fermetures restent telles quelles, mais se changent désormais à la main, et le ' +
      'registre ne les garde plus alignées sur le calendrier.',
    collega: 'Lier au calendrier officiel',
    collegaAiuto:
      'Liée, l’année reprend début, fin et fermetures du calendrier et ne les laisse pas ' +
      'changer par erreur.',
    collegaTitolo: (fonte) => `Lier l’année au calendrier officiel ${fonte} ?`,
    collegaTesto: (riconosciute) =>
      'Début, fin et fermetures deviennent les officiels et ne se changent plus à la main ; les ' +
      'fermetures propres restent.' +
      (riconosciute > 0
        ? ` ${plurale(riconosciute, 'fermeture saisie', 'fermetures saisies')} à la main ` +
          `${riconosciute === 1 ? 'correspond' : 'correspondent'} au calendrier : ` +
          `${riconosciute === 1 ? 'elle devient liée et verrouillée' : 'elles deviennent liées et verrouillées'}.`
        : ''),
  },
  en: {
    daAggiungere: 'to add',
    giaCe: (etichetta) => `already there as “${etichetta}”: will be linked`,
    ora: (quando) => `now ${quando}`,
    nome: (cantone) => `${cantone} school calendar`,
    nonCeAncora: (nome, inizio) =>
      `${nome}: the year starting on ${inizio} ` +
      'is not yet in this version of the register.',
    allineato: (fonte, voci) =>
      `${fonte}: the year matches (${plurale(voci, 'entry', 'entries')}).`,
    daFare: (fonte, voci, allineate) =>
      `${fonte}: ${plurale(voci, 'entry', 'entries')} the year doesn’t have like this` +
      (allineate > 0 ? `, ${plurale(allineate, 'other', 'others')} already in place.` : '.'),
    importa: 'Import the chosen entries',
    aMano: 'dates entered by hand',
    dalCalendario: (cantone) => `from the ${cantone} calendar: dates, holidays and public holidays`,
    fonte: (cantone, anno) => `${cantone} ${anno}`,
    dalCalendarioUfficiale: (fonte) => `From the official calendar · ${fonte}`,
    chiusuraUfficiale: 'official',
    segue: (fonte) =>
      `The year follows the official ${fonte} calendar: start, end and official closures ` +
      'can’t be changed by hand. Your own closures are added and removed as usual.',
    seguira: (fonte) =>
      `The year will follow the official ${fonte} calendar: start, end and official closures ` +
      'stay locked. To enter them by hand, choose “dates entered by hand” at the top.',
    daRiallineare: (voci) =>
      'This version of the register has an updated calendar: ' +
      `${plurale(voci, 'entry', 'entries')} to realign.`,
    riallinea: 'Realign with the calendar',
    stacca: 'Unlink from the official calendar',
    staccaTitolo: 'Unlink the year from the official calendar?',
    staccaTesto:
      'Dates and closures stay as they are, but from now on they are changed by hand and the ' +
      'register no longer keeps them in line with the calendar.',
    collega: 'Link to the official calendar',
    collegaAiuto:
      'Once linked, the year takes start, end and closures from the calendar and doesn’t let ' +
      'them be changed by mistake.',
    collegaTitolo: (fonte) => `Link the year to the official ${fonte} calendar?`,
    collegaTesto: (riconosciute) =>
      'Start, end and closures become the official ones and can no longer be changed by hand; ' +
      'your own closures stay.' +
      (riconosciute > 0
        ? ` ${plurale(riconosciute, 'closure', 'closures')} entered by hand ` +
          `${riconosciute === 1 ? 'matches' : 'match'} the calendar: ` +
          `${riconosciute === 1 ? 'it becomes linked and locked' : 'they become linked and locked'}.`
        : ''),
  },
})

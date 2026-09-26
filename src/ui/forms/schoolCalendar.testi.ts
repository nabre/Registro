// I testi di `forms/schoolCalendar.ts`: il calendario scolastico ufficiale
// dentro i moduli dell'anno.
//
// Il nome del Cantone arriva dai dati, scritto in italiano: le lingue che lo
// chiamano in un altro modo lo rinominano qui.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

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
  },
})

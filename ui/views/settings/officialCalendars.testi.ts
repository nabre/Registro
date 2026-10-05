// I testi della scheda dei calendari ufficiali (`settings/officialCalendars.tsx`).
// Nomi delle chiusure e descrizione della fonte vengono dal calendario generato
// così come sono scritti nei PDF: sono dati, non si traducono.

import { catalogo } from '#core/i18n/index.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  titolo: (cantone: string) => `Calendario ufficiale · ${cantone}`,
  aiuto:
    'I calendari scolastici che il registro porta con sé, anno per anno, come sono stati letti ' +
    'dai PDF ufficiali. Un anno nuovo scelto dal calendario prende esattamente queste voci: ' +
    'inizio e fine delle lezioni e le chiusure. Qui si guarda e basta: il documento non cambia.',
  fonteLetta: (fonte: string, data: string) => `${fonte}. Letto il ${data}.`,
  anni: 'Anni scolastici del calendario',
  inCorso: 'Anno in corso',
  chiusure: (n: number) => plurale(n, 'chiusura', 'chiusure'),
  pdf: 'PDF di riferimento',
  pdfAiuto: 'Apre nel browser il PDF da cui sono state lette queste date',
  nonScritta: 'non scritta nel PDF',
  chiusura: 'Chiusura',
  tipi: {
    vacanza: 'Vacanze',
    festivo: 'Festivo',
    giorno_di_vacanza: 'Giorno di vacanza',
  },
  nessunaChiusura: 'Il PDF non porta chiusure per quest’anno.',
  nonImportate: (voci: string) =>
    `Non si importano: ${voci}. Cadono dopo l’ultimo giorno di scuola, fra un anno e l’altro.`,
}

export const testi = catalogo(it, {
  de: {
    titolo: (cantone) => `Offizieller Kalender · ${cantone}`,
    aiuto:
      'Die Schulkalender, die das Klassenbuch mitbringt, Jahr für Jahr, so wie sie aus den ' +
      'offiziellen PDFs gelesen wurden. Ein neues Schuljahr aus dem Kalender übernimmt genau ' +
      'diese Einträge: Unterrichtsbeginn und -ende und die Schliessungen. Hier wird nur ' +
      'geschaut: Das Dokument ändert sich nicht.',
    fonteLetta: (fonte, data) => `${fonte}. Gelesen am ${data}.`,
    anni: 'Schuljahre des Kalenders',
    inCorso: 'Laufendes Schuljahr',
    chiusure: (n) => plurale(n, 'Schliessung', 'Schliessungen'),
    pdf: 'Referenz-PDF',
    pdfAiuto: 'Öffnet im Browser das PDF, aus dem diese Daten gelesen wurden',
    nonScritta: 'nicht im PDF',
    chiusura: 'Schliessung',
    tipi: {
      vacanza: 'Ferien',
      festivo: 'Feiertag',
      giorno_di_vacanza: 'Freier Tag',
    },
    nessunaChiusura: 'Das PDF nennt für dieses Schuljahr keine Schliessungen.',
    nonImportate: (voci) =>
      `Nicht übernommen: ${voci}. Sie liegen nach dem letzten Schultag, zwischen zwei Schuljahren.`,
  },
  fr: {
    titolo: (cantone) => `Calendrier officiel · ${cantone}`,
    aiuto:
      'Les calendriers scolaires que le registre emporte avec lui, année par année, tels qu’ils ' +
      'ont été lus dans les PDF officiels. Une nouvelle année choisie dans le calendrier reprend ' +
      'exactement ces entrées : début et fin des cours et les fermetures. Ici on regarde ' +
      'seulement : le document ne change pas.',
    fonteLetta: (fonte, data) => `${fonte}. Lu le ${data}.`,
    anni: 'Années scolaires du calendrier',
    inCorso: 'Année en cours',
    chiusure: (n) => plurale(n, 'fermeture', 'fermetures'),
    pdf: 'PDF de référence',
    pdfAiuto: 'Ouvre dans le navigateur le PDF d’où ces dates ont été lues',
    nonScritta: 'absente du PDF',
    chiusura: 'Fermeture',
    tipi: {
      vacanza: 'Vacances',
      festivo: 'Jour férié',
      giorno_di_vacanza: 'Jour de congé',
    },
    nessunaChiusura: 'Le PDF n’indique aucune fermeture pour cette année.',
    nonImportate: (voci) =>
      `Non reprises : ${voci}. Elles tombent après le dernier jour d’école, entre deux années.`,
  },
  en: {
    titolo: (cantone) => `Official calendar · ${cantone}`,
    aiuto:
      'The school calendars the register carries with it, year by year, as they were read from ' +
      'the official PDFs. A new year chosen from the calendar takes exactly these entries: start ' +
      'and end of lessons and the closures. This is only for looking: the document does not ' +
      'change.',
    fonteLetta: (fonte, data) => `${fonte}. Read on ${data}.`,
    anni: 'School years in the calendar',
    inCorso: 'Current year',
    chiusure: (n) => plurale(n, 'closure', 'closures'),
    pdf: 'Reference PDF',
    pdfAiuto: 'Opens in the browser the PDF these dates were read from',
    nonScritta: 'not in the PDF',
    chiusura: 'Closure',
    tipi: {
      vacanza: 'Holidays',
      festivo: 'Public holiday',
      giorno_di_vacanza: 'Day off',
    },
    nessunaChiusura: 'The PDF lists no closures for this year.',
    nonImportate: (voci) =>
      `Not imported: ${voci}. They fall after the last school day, between one year and the next.`,
  },
})

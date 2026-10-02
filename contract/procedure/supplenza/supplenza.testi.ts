// I testi delle procedure di `supplenza`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '#core/i18n/index.js'

const it = {
  prepara: {
    titolo:
      'Prepara la supplenza: uno zip accanto al documento con allievi e foto, piano e risorse ' +
      'delle ore scelte, e se c’è un indirizzo la mail che lo porta',
    lezioni: 'Le ore in cui manco, una o più; quelle annullate restano fuori',
    supplente: 'Il nome di chi tiene le ore, se lo si sa',
    email: 'A chi va la mail con lo zip: chi sostituisce o il segretariato. Assente: solo lo zip',
    segretariato: 'Vero se l’indirizzo è del segretariato, che girerà il pacchetto',
    conferma: 'Con l’invio diretto, spedisce senza chiedere conferma',
  },
}

export const testi = catalogo(it, {
  de: {
    prepara: {
      titolo:
        'Bereitet die Stellvertretung vor: ein ZIP neben dem Dokument mit Schülerinnen und Schülern ' +
        'samt Fotos, Plan und Materialien der gewählten Lektionen, und mit Adresse die E-Mail dazu',
      lezioni: 'Die Lektionen, in denen ich fehle, eine oder mehrere; abgesagte bleiben draussen',
      supplente: 'Der Name der vertretenden Person, falls bekannt',
      email: 'An wen die E-Mail mit dem ZIP geht: vertretende Person oder Sekretariat. Fehlt sie: nur das ZIP',
      segretariato: 'Wahr, wenn die Adresse dem Sekretariat gehört, das das Paket weiterleitet',
      conferma: 'Beim direkten Versand ohne Rückfrage senden',
    },
  },
  fr: {
    prepara: {
      titolo:
        'Prépare la suppléance : un zip à côté du document avec les élèves et leurs photos, le plan ' +
        'et les ressources des heures choisies, et avec une adresse l’e-mail qui l’accompagne',
      lezioni: 'Les heures où je suis absent, une ou plusieurs ; les annulées restent dehors',
      supplente: 'Le nom de qui donnera les heures, si on le sait',
      email: 'À qui va l’e-mail avec le zip : le suppléant ou le secrétariat. Absente : seulement le zip',
      segretariato: 'Vrai si l’adresse est celle du secrétariat, qui transmettra le dossier',
      conferma: 'Avec l’envoi direct, envoie sans demander de confirmation',
    },
  },
  en: {
    prepara: {
      titolo:
        'Prepares cover: a zip next to the document with students and photos, plan and resources ' +
        'of the chosen lessons, and with an address the email that carries it',
      lezioni: 'The lessons I miss, one or more; cancelled ones are left out',
      supplente: 'The name of whoever covers, if known',
      email: 'Who gets the email with the zip: the cover teacher or the office. Absent: only the zip',
      segretariato: 'True if the address is the office’s, which will pass the package on',
      conferma: 'With direct sending, sends without asking for confirmation',
    },
  },
})

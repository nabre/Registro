// I testi di `substitute.ts`: il modulo della supplenza in cui manco io.

import { catalogo } from '#core/i18n/index.js'

const it = {
  titolo: 'Prepara la supplenza',
  aiuto:
    'Per quando manchi e un collega tiene le tue ore. Accanto al documento nasce uno zip con ' +
    'l’elenco degli allievi con le foto, il piano dettagliato di ogni ora e le sue risorse; ' +
    'con un indirizzo parte anche la mail che lo porta.',
  prepara: 'Prepara',
  aChi: 'A chi mandarlo',
  alSupplente: 'A chi mi sostituisce',
  alSegretariato: 'Al segretariato',
  soloZip: 'A nessuno: solo lo zip',
  supplente: 'Supplente',
  segnapostoSupplente: 'Nome e cognome',
  segnapostoEmail: 'nome.cognome@scuola.ch',
  aiutoEmail:
    'Di chi sostituisce, o del segretariato. Quello del segretariato si può scrivere una volta ' +
    'per tutte in Impostazioni › Utente › Posta.',
  ore: 'Ore da lasciare',
  nessunaOra: 'Scegli almeno un’ora.',
  serveEmail: 'Manca l’indirizzo e-mail.',
  nonRiuscita: 'La supplenza non si è preparata.',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Stellvertretung vorbereiten',
    aiuto:
      'Für wenn du fehlst und eine Kollegin oder ein Kollege deine Lektionen übernimmt. Neben dem ' +
      'Dokument entsteht ein ZIP mit der Liste der Schülerinnen und Schüler samt Fotos, dem ' +
      'ausführlichen Plan jeder Lektion und ihren Materialien; mit einer Adresse geht auch die E-Mail dazu hinaus.',
    prepara: 'Vorbereiten',
    aChi: 'An wen senden',
    alSupplente: 'An die vertretende Person',
    alSegretariato: 'An das Sekretariat',
    soloZip: 'An niemanden: nur das ZIP',
    supplente: 'Stellvertretung',
    segnapostoSupplente: 'Vor- und Nachname',
    segnapostoEmail: 'vorname.nachname@schule.ch',
    aiutoEmail:
      'Der vertretenden Person oder des Sekretariats. Die des Sekretariats kann man einmal für ' +
      'immer unter Einstellungen › Benutzer › Post eintragen.',
    ore: 'Abzugebende Lektionen',
    nessunaOra: 'Wähle mindestens eine Lektion.',
    serveEmail: 'Die E-Mail-Adresse fehlt.',
    nonRiuscita: 'Die Stellvertretung liess sich nicht vorbereiten.',
  },
  fr: {
    titolo: 'Préparer la suppléance',
    aiuto:
      'Pour quand tu es absent et qu’un collègue donne tes heures. À côté du document naît un zip ' +
      'avec la liste des élèves et leurs photos, le plan détaillé de chaque heure et ses ' +
      'ressources ; avec une adresse, l’e-mail qui l’accompagne part aussi.',
    prepara: 'Préparer',
    aChi: 'À qui l’envoyer',
    alSupplente: 'À qui me remplace',
    alSegretariato: 'Au secrétariat',
    soloZip: 'À personne : seulement le zip',
    supplente: 'Suppléant',
    segnapostoSupplente: 'Prénom et nom',
    segnapostoEmail: 'prenom.nom@ecole.ch',
    aiutoEmail:
      'Du suppléant, ou du secrétariat. Celle du secrétariat peut s’écrire une fois pour toutes ' +
      'dans Paramètres › Utilisateur › Messagerie.',
    ore: 'Heures à laisser',
    nessunaOra: 'Choisis au moins une heure.',
    serveEmail: 'L’adresse e-mail manque.',
    nonRiuscita: 'La suppléance n’a pas pu être préparée.',
  },
  en: {
    titolo: 'Prepare cover',
    aiuto:
      'For when you’re away and a colleague teaches your lessons. Next to the document a zip is ' +
      'made with the student list and photos, the detailed plan of each lesson and its resources; ' +
      'with an address, the email that carries it goes out too.',
    prepara: 'Prepare',
    aChi: 'Send to',
    alSupplente: 'The cover teacher',
    alSegretariato: 'The school office',
    soloZip: 'Nobody: just the zip',
    supplente: 'Cover teacher',
    segnapostoSupplente: 'First and last name',
    segnapostoEmail: 'firstname.lastname@school.ch',
    aiutoEmail:
      'The cover teacher’s or the office’s. The office one can be set once and for all in ' +
      'Settings › User › Mail.',
    ore: 'Lessons to hand over',
    nessunaOra: 'Choose at least one lesson.',
    serveEmail: 'The email address is missing.',
    nonRiuscita: 'Cover could not be prepared.',
  },
})

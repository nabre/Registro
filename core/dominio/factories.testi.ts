// I testi con cui nascono le cose nuove (`factories.ts`): lettere di serie per
// assenze e documenti spediti, nome di una sospensione senza nome.
//
// Sono dati: finiscono nel documento alla nascita e restano nella lingua di
// allora. I segnaposto fra graffe sono uguali in ogni lingua perché li riempie
// il codice (`testoAssenze`, `testoConsegna`).

import { catalogo } from '../i18n/index.js'

const it = {
  corpoAssenze: [
    'Gentili signore, egregi signori,',
    '',
    // `{rapporti}` dice quali fogli sono allegati (assenze, ritardi o tutti e due).
    'in allegato trovate {rapporti} di {allievo} ({classe}) per il periodo {periodo}.',
    '',
    // «quanto allegato… rispedircelo» regge sia con un foglio sia con due.
    'Vi chiediamo cortesemente di controfirmare quanto allegato e di rispedircelo per e-mail.',
    '',
    'Ringraziando per la collaborazione, porgiamo cordiali saluti.',
  ].join('\n'),
  corpoConsegna: [
    'Gentili signore, egregi signori,',
    '',
    'in allegato trovate {documento} di {allievo} ({classe}).',
    '',
    'Restiamo a disposizione per ogni chiarimento e porgiamo cordiali saluti.',
  ].join('\n'),
  sospensione: 'Sospensione',
}

export const testi = catalogo(it, {
  de: {
    corpoAssenze: [
      'Sehr geehrte Damen und Herren',
      '',
      'Im Anhang finden Sie {rapporti} von {allievo} ({classe}) für den Zeitraum {periodo}.',
      '',
      'Wir bitten Sie freundlich, die Beilage zu unterschreiben und uns per E-Mail ' +
        'zurückzusenden.',
      '',
      'Besten Dank für die Zusammenarbeit und freundliche Grüsse',
    ].join('\n'),
    corpoConsegna: [
      'Sehr geehrte Damen und Herren',
      '',
      'Im Anhang finden Sie {documento} von {allievo} ({classe}).',
      '',
      'Für Fragen stehen wir Ihnen gerne zur Verfügung.',
      '',
      'Freundliche Grüsse',
    ].join('\n'),
    sospensione: 'Unterrichtsfreie Zeit',
  },
  fr: {
    corpoAssenze: [
      'Madame, Monsieur,',
      '',
      'Vous trouverez ci-joint {rapporti} de {allievo} ({classe}) pour la période {periodo}.',
      '',
      'Nous vous prions de bien vouloir contresigner le document ci-joint et de nous le ' +
        'renvoyer par e-mail.',
      '',
      'En vous remerciant de votre collaboration, nous vous adressons nos meilleures salutations.',
    ].join('\n'),
    corpoConsegna: [
      'Madame, Monsieur,',
      '',
      'Vous trouverez ci-joint {documento} de {allievo} ({classe}).',
      '',
      'Nous restons à votre disposition pour tout renseignement et vous adressons nos ' +
        'meilleures salutations.',
    ].join('\n'),
    sospensione: 'Interruption des cours',
  },
  en: {
    corpoAssenze: [
      'Dear Sir or Madam,',
      '',
      'Please find attached {rapporti} for {allievo} ({classe}) for the period {periodo}.',
      '',
      'We would be grateful if you could countersign the attached and return it to us by email.',
      '',
      'Thank you for your cooperation.',
      '',
      'Kind regards',
    ].join('\n'),
    corpoConsegna: [
      'Dear Sir or Madam,',
      '',
      'Please find attached {documento} for {allievo} ({classe}).',
      '',
      'Please do not hesitate to contact us if you have any questions.',
      '',
      'Kind regards',
    ].join('\n'),
    sospensione: 'Closure',
  },
})

// I testi del CSV guardato nella cornice della pagina Documenti (`csv.ts`).

import { catalogo } from '../../../i18n/index.js'

const it = {
  leggendo: 'Sto leggendo il foglio…',
  illeggibile: (errore: string) =>
    `Questo foglio non si è lasciato leggere: ${errore}. ` +
    'Si apre lo stesso nel foglio di calcolo, con il pulsante qui sopra.',
  vuoto: 'Questo foglio è vuoto.',
  /** Il motivo, quando il file non arriva: entra nella frase qui sopra. */
  risposta: (codice: number) => `il protocollo ha risposto ${codice}`,
}

export const testi = catalogo(it, {
  de: {
    leggendo: 'Die Tabelle wird gelesen…',
    illeggibile: (errore) =>
      `Diese Tabelle liess sich nicht lesen: ${errore}. ` +
      'Sie öffnet sich trotzdem in der Tabellenkalkulation, mit dem Knopf oben.',
    vuoto: 'Diese Tabelle ist leer.',
    risposta: (codice) => `das Protokoll antwortete mit ${codice}`,
  },
  fr: {
    leggendo: 'Lecture de la feuille…',
    illeggibile: (errore) =>
      `Cette feuille n’a pas pu être lue : ${errore}. ` +
      'Elle s’ouvre quand même dans le tableur, avec le bouton ci-dessus.',
    vuoto: 'Cette feuille est vide.',
    risposta: (codice) => `le protocole a répondu ${codice}`,
  },
  en: {
    leggendo: 'Reading the sheet…',
    illeggibile: (errore) =>
      `This sheet couldn’t be read: ${errore}. ` +
      'It still opens in the spreadsheet, with the button above.',
    vuoto: 'This sheet is empty.',
    risposta: (codice) => `the protocol answered ${codice}`,
  },
})

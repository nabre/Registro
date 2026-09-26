// I testi delle procedure di `modelli`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento. Nomi di modelli e file
// (`verbale-lezione`, `_blocchi.tpl`) e parole chiave (`ripeti:`, `usa:`,
// `estende:`) restano uguali in ogni lingua.

import { catalogo } from '../../../i18n/index.js'

const it = {
  leggi: {
    titolo: 'Il testo di un modello del programma, e i nomi che quel rapporto riempie',
    valori: 'I `{{segnaposto}}` che quel rapporto produce',
    gruppi: 'I gruppi su cui `ripeti:` gira',
    blocchi: 'I pezzi di `_blocchi.tpl` che `usa:` richiama',
    frasi: 'Le frasi di `_testi.tpl`',
    immagini:
      'Le immagini che un modello può chiedere per nome: `logo.png`, se il documento ha un logo',
    modelli: 'I modelli che `estende:` può nominare',
  },
  prova: {
    titolo: 'L’anteprima di un modello su dati veri, in PDF, senza scrivere niente',
    nome: '`verbale-lezione`, `scheda-allievo`, …: un rapporto del catalogo',
    pdf: 'Il PDF appena composto, in base64',
  },
}

export const testi = catalogo(it, {
  de: {
    leggi: {
      titolo:
        'Der Text einer Vorlage des Programms und die Namen, die dieser Bericht ausfüllt',
      valori: 'Die `{{Platzhalter}}`, die dieser Bericht liefert',
      gruppi: 'Die Gruppen, über die `ripeti:` läuft',
      blocchi: 'Die Bausteine aus `_blocchi.tpl`, die `usa:` aufruft',
      frasi: 'Die Sätze aus `_testi.tpl`',
      immagini:
        'Die Bilder, die eine Vorlage beim Namen anfordern kann: `logo.png`, wenn das Dokument ' +
        'ein Logo hat',
      modelli: 'Die Vorlagen, die `estende:` nennen kann',
    },
    prova: {
      titolo: 'Die Vorschau einer Vorlage mit echten Daten, als PDF, ohne etwas zu schreiben',
      nome: '`verbale-lezione`, `scheda-allievo`, …: ein Bericht aus dem Katalog',
      pdf: 'Das soeben erstellte PDF, in Base64',
    },
  },
  fr: {
    leggi: {
      titolo:
        'Le texte d’un modèle du programme, et les noms que ce rapport remplit',
      valori: 'Les `{{espaces réservés}}` que ce rapport produit',
      gruppi: 'Les groupes sur lesquels `ripeti:` tourne',
      blocchi: 'Les morceaux de `_blocchi.tpl` que `usa:` appelle',
      frasi: 'Les phrases de `_testi.tpl`',
      immagini:
        'Les images qu’un modèle peut demander par leur nom : `logo.png`, si le document a ' +
        'un logo',
      modelli: 'Les modèles que `estende:` peut nommer',
    },
    prova: {
      titolo: 'L’aperçu d’un modèle sur des données réelles, en PDF, sans rien écrire',
      nome: '`verbale-lezione`, `scheda-allievo`, … : un rapport du catalogue',
      pdf: 'Le PDF qui vient d’être composé, en base64',
    },
  },
  en: {
    leggi: {
      titolo: 'The text of one of the program’s templates, and the names that report fills in',
      valori: 'The `{{placeholders}}` that report produces',
      gruppi: 'The groups that `ripeti:` loops over',
      blocchi: 'The pieces of `_blocchi.tpl` that `usa:` calls',
      frasi: 'The sentences of `_testi.tpl`',
      immagini:
        'The images a template can ask for by name: `logo.png`, if the document has a logo',
      modelli: 'The templates that `estende:` can name',
    },
    prova: {
      titolo: 'The preview of a template on real data, as a PDF, without writing anything',
      nome: '`verbale-lezione`, `scheda-allievo`, …: a report from the catalogue',
      pdf: 'The PDF just composed, in base64',
    },
  },
})

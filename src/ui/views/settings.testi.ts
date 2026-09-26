// I testi della pagina delle impostazioni (`settings.ts`). I nomi delle
// sezioni stanno in `settings/sections.testi.ts`, le voci nel manifesto.

import { catalogo } from '../../i18n/index.js'

const it = {
  titolo: 'Impostazioni',
  documentoAiuto: 'Stanno dentro il documento d’anno e viaggiano con lui.',
  /** La pastiglia accanto a quel che si salva nel documento, e il suo perché. */
  file: 'file',
  fileAiuto: 'Si salva dentro il file dell’anno e viaggia con lui',
  gruppi: 'Gruppi',
  filtraSegnaposto: 'Filtra le impostazioni per nome, chiave o descrizione…',
  filtraEtichetta: 'Filtra le impostazioni del programma',
  nessunaCorrispondenza: 'Nessuna corrispondenza',
  nienteCosi: 'Niente che si chiami così',
  nienteCosiTesto:
    'Il filtro guarda il nome, la chiave e la descrizione. Le impostazioni dell’anno — '
    + 'la griglia oraria, la scala dei voti — stanno nell’altro ambito, e qui non compaiono.',
  trovate: (quante: number) => `Trovate (${quante})`,
  trovateAiuto: 'le impostazioni del programma che corrispondono, sezione per sezione',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Einstellungen',
    documentoAiuto: 'Sie stehen im Jahresdokument und reisen mit ihm.',
    file: 'Datei',
    fileAiuto: 'Wird in der Datei des Jahres gespeichert und reist mit ihr',
    gruppi: 'Gruppen',
    filtraSegnaposto: 'Einstellungen nach Name, Schlüssel oder Beschreibung filtern…',
    filtraEtichetta: 'Einstellungen des Programms filtern',
    nessunaCorrispondenza: 'Keine Treffer',
    nienteCosi: 'Nichts, das so heisst',
    nienteCosiTesto:
      'Der Filter sucht in Name, Schlüssel und Beschreibung. Die Einstellungen des Jahres — '
      + 'das Stundenraster, die Notenskala — gehören zum anderen Bereich und erscheinen hier '
      + 'nicht.',
    trovate: (quante) => `Gefunden (${quante})`,
    trovateAiuto: 'die passenden Einstellungen des Programms, Abschnitt für Abschnitt',
  },
  fr: {
    titolo: 'Paramètres',
    documentoAiuto: 'Ils sont dans le document de l’année et voyagent avec lui.',
    file: 'fichier',
    fileAiuto: 'S’enregistre dans le fichier de l’année et voyage avec lui',
    gruppi: 'Groupes',
    filtraSegnaposto: 'Filtrer les paramètres par nom, clé ou description…',
    filtraEtichetta: 'Filtrer les paramètres du programme',
    nessunaCorrispondenza: 'Aucun résultat',
    nienteCosi: 'Rien qui s’appelle ainsi',
    nienteCosiTesto:
      'Le filtre regarde le nom, la clé et la description. Les paramètres de l’année — '
      + 'la grille horaire, le barème — sont dans l’autre domaine, et n’apparaissent pas ici.',
    trovate: (quante) => `Trouvés (${quante})`,
    trovateAiuto: 'les paramètres du programme qui correspondent, section par section',
  },
  en: {
    titolo: 'Settings',
    documentoAiuto: 'They live inside the year’s document and travel with it.',
    file: 'file',
    fileAiuto: 'Saved inside the year’s file and travels with it',
    gruppi: 'Groups',
    filtraSegnaposto: 'Filter settings by name, key or description…',
    filtraEtichetta: 'Filter the program settings',
    nessunaCorrispondenza: 'No matches',
    nienteCosi: 'Nothing by that name',
    nienteCosiTesto:
      'The filter looks at the name, the key and the description. The year’s settings — '
      + 'the timetable grid, the grading scale — belong to the other scope and do not appear here.',
    trovate: (quante) => `Found (${quante})`,
    trovateAiuto: 'the program settings that match, section by section',
  },
})

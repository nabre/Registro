// I testi della pagina delle impostazioni (`settings.ts`). I nomi di aree e
// sezioni stanno in `settings/sections.testi.ts`, le voci nel manifesto.

import { catalogo } from '../../../core/i18n/index.js'

const it = {
  titolo: 'Impostazioni',
  aiutoPagina:
    'Quattro aree, una pagina ciascuna. Ogni blocco dice dove sta: «Questo anno» è dentro il ' +
    'file dell’anno e viaggia con lui; «Questo computer» resta qui e vale per tutti gli anni.',
  /** Il nome della fila delle aree, per chi legge con il lettore di schermo. */
  aree: 'Aree delle impostazioni',
  /** L'indice delle sezioni a sinistra, e la sua tendina su schermo stretto. */
  indice: 'Sezioni dell’area',
  indiceTendina: 'Vai alla sezione',
  /** Il numero sulla scheda dell'area, detto per intero. */
  modificate: (quante: number) =>
    quante === 1 ? '1 impostazione decisa a mano' : `${quante} impostazioni decise a mano`,
  filtraSegnaposto: 'Cerca fra tutte le impostazioni: nome, chiave, descrizione…',
  filtraEtichetta: 'Cerca fra le impostazioni',
  nessunaCorrispondenza: 'Nessuna corrispondenza',
  nienteCosi: 'Niente che si chiami così',
  nienteCosiTesto:
    'Il filtro guarda il nome, la chiave e la descrizione delle impostazioni del computer, e ' +
    'il nome e il contenuto delle sezioni dell’anno.',
  trovate: (quante: number) => `Trovate (${quante})`,
  trovateAiuto: 'le impostazioni che corrispondono, area per area',
  /** Il gesto accanto a un risultato: porta la pagina sulla sua sezione. */
  vaiAllaSezione: 'Vai alla sezione',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Einstellungen',
    aiutoPagina:
      'Vier Bereiche, je eine Seite. Jeder Block sagt, wo er steht: «Dieses Jahr» steht in der ' +
      'Datei des Jahres und reist mit ihr; «Dieser Computer» bleibt hier und gilt für alle Jahre.',
    aree: 'Bereiche der Einstellungen',
    indice: 'Abschnitte des Bereichs',
    indiceTendina: 'Zum Abschnitt',
    modificate: (quante) =>
      quante === 1 ? '1 Einstellung von Hand gewählt' : `${quante} Einstellungen von Hand gewählt`,
    filtraSegnaposto: 'In allen Einstellungen suchen: Name, Schlüssel, Beschreibung…',
    filtraEtichetta: 'In den Einstellungen suchen',
    nessunaCorrispondenza: 'Keine Treffer',
    nienteCosi: 'Nichts, das so heisst',
    nienteCosiTesto:
      'Der Filter sucht in Name, Schlüssel und Beschreibung der Einstellungen des Computers, ' +
      'und in Name und Inhalt der Abschnitte des Jahres.',
    trovate: (quante) => `Gefunden (${quante})`,
    trovateAiuto: 'die passenden Einstellungen, Bereich für Bereich',
    vaiAllaSezione: 'Zum Abschnitt',
  },
  fr: {
    titolo: 'Paramètres',
    aiutoPagina:
      'Quatre domaines, une page chacun. Chaque bloc dit où il se trouve : « Cette année » est ' +
      'dans le fichier de l’année et voyage avec lui ; « Cet ordinateur » reste ici et vaut pour ' +
      'toutes les années.',
    aree: 'Domaines des paramètres',
    indice: 'Sections du domaine',
    indiceTendina: 'Aller à la section',
    modificate: (quante) =>
      quante === 1 ? '1 paramètre choisi à la main' : `${quante} paramètres choisis à la main`,
    filtraSegnaposto: 'Chercher dans tous les paramètres : nom, clé, description…',
    filtraEtichetta: 'Chercher dans les paramètres',
    nessunaCorrispondenza: 'Aucun résultat',
    nienteCosi: 'Rien qui s’appelle ainsi',
    nienteCosiTesto:
      'Le filtre regarde le nom, la clé et la description des paramètres de l’ordinateur, et le ' +
      'nom et le contenu des sections de l’année.',
    trovate: (quante) => `Trouvés (${quante})`,
    trovateAiuto: 'les paramètres qui correspondent, domaine par domaine',
    vaiAllaSezione: 'Aller à la section',
  },
  en: {
    titolo: 'Settings',
    aiutoPagina:
      'Four areas, one page each. Every block says where it lives: “This year” is inside the ' +
      'year’s file and travels with it; “This computer” stays here and applies to every year.',
    aree: 'Settings areas',
    indice: 'Sections of the area',
    indiceTendina: 'Go to section',
    modificate: (quante) =>
      quante === 1 ? '1 setting chosen by hand' : `${quante} settings chosen by hand`,
    filtraSegnaposto: 'Search all settings: name, key, description…',
    filtraEtichetta: 'Search the settings',
    nessunaCorrispondenza: 'No matches',
    nienteCosi: 'Nothing by that name',
    nienteCosiTesto:
      'The filter looks at the name, the key and the description of this computer’s settings, ' +
      'and at the name and content of the year’s sections.',
    trovate: (quante) => `Found (${quante})`,
    trovateAiuto: 'the settings that match, area by area',
    vaiAllaSezione: 'Go to section',
  },
})

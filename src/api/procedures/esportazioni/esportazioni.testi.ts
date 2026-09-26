// I testi delle procedure di `esportazioni`. Si leggono al momento dell'uso,
// mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  apri: {
    titolo: 'Apre un documento già esportato con il programma del sistema',
    percorso: 'Relativo alla cartella dei dati, `esportazioni/` compreso',
  },
  elimina: {
    titolo: 'Butta via un documento esportato',
  },
  mostra: {
    titolo: 'Mostra un documento esportato nella cornice del registro',
    titoloFinestra: 'Il nome in cima alla finestra. Senza, il nome del file',
  },
}

export const testi = catalogo(it, {
  de: {
    apri: {
      titolo: 'Öffnet ein bereits exportiertes Dokument mit dem Programm des Systems',
      percorso: 'Relativ zum Datenordner, `esportazioni/` eingeschlossen',
    },
    elimina: {
      titolo: 'Löscht ein exportiertes Dokument',
    },
    mostra: {
      titolo: 'Zeigt ein exportiertes Dokument im Rahmen des Klassenbuchs',
      titoloFinestra: 'Der Name oben im Fenster. Ohne ihn der Dateiname',
    },
  },
  fr: {
    apri: {
      titolo: 'Ouvre un document déjà exporté avec le programme du système',
      percorso: 'Relatif au dossier des données, `esportazioni/` compris',
    },
    elimina: {
      titolo: 'Supprime un document exporté',
    },
    mostra: {
      titolo: 'Affiche un document exporté dans le cadre du registre',
      titoloFinestra: 'Le nom en haut de la fenêtre. Sans lui, le nom du fichier',
    },
  },
  en: {
    apri: {
      titolo: 'Opens an already exported document with the system’s program',
      percorso: 'Relative to the data folder, `esportazioni/` included',
    },
    elimina: {
      titolo: 'Deletes an exported document',
    },
    mostra: {
      titolo: 'Shows an exported document inside the register’s frame',
      titoloFinestra: 'The name at the top of the window. Without it, the file name',
    },
  },
})

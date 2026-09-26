// I testi delle procedure di `documenti`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  inventario: {
    titolo:
      'Che cosa c’è scritto nel documento d’anno — fogli e fascicoli — e con quali modelli escono',
    percorso: 'Relativo alla cartella dei dati, la cartella radice compresa',
    misura: 'In byte: un PDF da zero byte è un foglio da rifare',
    revisione: 'Quante volte è stato riscritto da quando l’anno è aperto',
    esportazioni: 'Quel che sta sotto `esportazioni/`',
    archivio: 'Quel che sta sotto `archivio/`, quarantena compresa',
    percorsi: 'I fogli che lo compongono, nell’ordine',
    fileModello: 'Come si chiama nella `templates/` del programma',
    genereModello: 'Il rapporto su cui se ne guarda l’anteprima',
    modelli: 'I modelli del programma: uguali per tutti i documenti, e non si cambiano da qui',
    presentazione: {
      titolo: 'Che cosa c’è scritto nel documento d’anno',
      fogliEsportati: 'Fogli esportati',
      foglio: 'Foglio',
      misura: 'Misura',
      revisione: 'Revisione',
      documentiRaccolti: 'Documenti raccolti',
      documento: 'Documento',
      fascicoli: 'Fascicoli',
      fascicolo: 'Fascicolo',
      fogli: 'Fogli',
      aggiornato: 'Aggiornato',
      modelliDelProgramma: 'Modelli del programma',
      modello: 'Modello',
      cheCose: 'Che cos’è',
      ruolo: 'Ruolo',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    inventario: {
      titolo:
        'Was im Jahresdokument steht – Blätter und Dossiers – und mit welchen Vorlagen sie ' +
        'erstellt werden',
      percorso: 'Relativ zum Datenordner, einschliesslich des Stammordners',
      misura: 'In Byte: Ein PDF mit null Byte ist ein Blatt, das neu erstellt werden muss',
      revisione: 'Wie oft es neu geschrieben wurde, seit das Jahr geöffnet ist',
      esportazioni: 'Was unter `esportazioni/` liegt',
      archivio: 'Was unter `archivio/` liegt, Quarantäne eingeschlossen',
      percorsi: 'Die Blätter, aus denen es besteht, in ihrer Reihenfolge',
      fileModello: 'Wie die Datei im Ordner `templates/` des Programms heisst',
      genereModello: 'Der Bericht, an dem man ihre Vorschau ansieht',
      modelli: 'Die Vorlagen des Programms: für alle Dokumente gleich und hier nicht änderbar',
      presentazione: {
        titolo: 'Was im Jahresdokument steht',
        fogliEsportati: 'Exportierte Blätter',
        foglio: 'Blatt',
        misura: 'Grösse',
        revisione: 'Revision',
        documentiRaccolti: 'Gesammelte Dokumente',
        documento: 'Dokument',
        fascicoli: 'Dossiers',
        fascicolo: 'Dossier',
        fogli: 'Blätter',
        aggiornato: 'Aktualisiert',
        modelliDelProgramma: 'Vorlagen des Programms',
        modello: 'Vorlage',
        cheCose: 'Was es ist',
        ruolo: 'Rolle',
      },
    },
  },
  fr: {
    inventario: {
      titolo:
        'Ce qui est écrit dans le document de l’année – feuilles et dossiers – et avec quels ' +
        'modèles ils sont produits',
      percorso: 'Relatif au dossier des données, dossier racine compris',
      misura: 'En octets : un PDF de zéro octet est une feuille à refaire',
      revisione: 'Combien de fois il a été réécrit depuis l’ouverture de l’année',
      esportazioni: 'Ce qui se trouve sous `esportazioni/`',
      archivio: 'Ce qui se trouve sous `archivio/`, quarantaine comprise',
      percorsi: 'Les feuilles qui le composent, dans l’ordre',
      fileModello: 'Le nom du fichier dans le dossier `templates/` du programme',
      genereModello: 'Le rapport sur lequel on en regarde l’aperçu',
      modelli:
        'Les modèles du programme : les mêmes pour tous les documents, et on ne les change ' +
        'pas d’ici',
      presentazione: {
        titolo: 'Ce qui est écrit dans le document de l’année',
        fogliEsportati: 'Feuilles exportées',
        foglio: 'Feuille',
        misura: 'Taille',
        revisione: 'Révision',
        documentiRaccolti: 'Documents recueillis',
        documento: 'Document',
        fascicoli: 'Dossiers',
        fascicolo: 'Dossier',
        fogli: 'Feuilles',
        aggiornato: 'Mis à jour',
        modelliDelProgramma: 'Modèles du programme',
        modello: 'Modèle',
        cheCose: 'Ce que c’est',
        ruolo: 'Rôle',
      },
    },
  },
  en: {
    inventario: {
      titolo:
        'What is written in the year document – sheets and class files – and which templates ' +
        'produce them',
      percorso: 'Relative to the data folder, root folder included',
      misura: 'In bytes: a zero-byte PDF is a sheet to redo',
      revisione: 'How many times it has been rewritten since the year was opened',
      esportazioni: 'What is under `esportazioni/`',
      archivio: 'What is under `archivio/`, quarantine included',
      percorsi: 'The sheets it is made of, in order',
      fileModello: 'What the file is called in the program’s `templates/` folder',
      genereModello: 'The report on which its preview is shown',
      modelli: 'The program’s templates: the same for every document, and not changed from here',
      presentazione: {
        titolo: 'What is written in the year document',
        fogliEsportati: 'Exported sheets',
        foglio: 'Sheet',
        misura: 'Size',
        revisione: 'Revision',
        documentiRaccolti: 'Collected documents',
        documento: 'Document',
        fascicoli: 'Class files',
        fascicolo: 'Class file',
        fogli: 'Sheets',
        aggiornato: 'Updated',
        modelliDelProgramma: 'Program templates',
        modello: 'Template',
        cheCose: 'What it is',
        ruolo: 'Role',
      },
    },
  },
})

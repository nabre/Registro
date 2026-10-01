// I testi delle procedure di `onedrive`. Si leggono al momento dell'uso, mai
// al caricamento.

import { catalogo } from '#core/i18n/index.js'

const it = {
  voce: {
    id: 'L’id dell’elemento nel suo drive',
    drive: 'Il drive che lo contiene: il proprio, o quello di chi l’ha condiviso',
    genere: 'cartella, o regi per un documento del registro',
    dimensione: 'In byte; zero per le cartelle',
    modificato: 'L’ultima modifica, ISO',
    percorso: 'Le cartelle dalla radice del drive; vuoto se Microsoft non lo dice',
    figli: 'Quante voci ha dentro una cartella, se si sa',
    locale: 'Vero se letto dalle cartelle che OneDrive sincronizza sul computer; allora drive è «locale» e id è il percorso',
  },
  elenco: {
    titolo: 'Una cartella di OneDrive: sottocartelle e documenti del registro',
    account: 'L’account collegato con cui si legge',
    drive: 'Il drive; senza, quello dell’account',
    cartella: 'L’id della cartella; senza, la radice',
    driveUscita: 'Il drive letto: da ripassare per scendere nelle cartelle',
    cartellaUscita: 'L’id della cartella; null alla radice',
    nome: 'Il nome della cartella; vuoto alla radice',
    percorso: 'Le cartelle dalla radice fino a questa, esclusa',
    superiore: 'L’id della cartella di sopra; null alla radice',
    altri: 'I file che non sono documenti del registro, soltanto contati',
    troncato: 'Vero se la cartella aveva troppi elementi per leggerli tutti',
    presentazione: {
      titolo: 'OneDrive',
      account: 'Account',
      cartella: 'Cartella',
      percorso: 'Percorso',
      altri: 'Altri file',
      nome: 'Nome',
      genere: 'Genere',
      dimensione: 'Dimensione',
      modificato: 'Modificato',
    },
  },
  cerca: {
    titolo: 'I documenti del registro su OneDrive, dal più recente: sincronizzati sul computer, o propri e condivisi',
    troncato: 'Vero se la ricerca si è fermata prima di guardare dappertutto',
    motivo: 'Perché si è fermata: troppi trovati, o tempo scaduto; null se non si è fermata',
    presentazione: 'Documenti del registro su OneDrive',
  },
  apri: {
    titolo:
      'Apre un documento del registro trovato su OneDrive: la copia sincronizzata sul computer, ' +
      'o una copia scaricata',
    drive: 'Il drive del documento, come l’ha dato onedrive.elenco o onedrive.cerca',
    id: 'L’id del documento, come l’ha dato onedrive.elenco o onedrive.cerca',
  },
}

export const testi = catalogo(it, {
  de: {
    voce: {
      id: 'Die ID des Elements in seinem Laufwerk',
      drive: 'Das Laufwerk, das es enthält: das eigene oder das der Person, die es geteilt hat',
      genere: 'cartella für einen Ordner, regi für ein Dokument des Klassenbuchs',
      dimensione: 'In Byte; 0 für Ordner',
      modificato: 'Die letzte Änderung, ISO',
      percorso: 'Die Ordner ab dem Stamm des Laufwerks; leer, wenn Microsoft es nicht sagt',
      figli: 'Wie viele Einträge ein Ordner enthält, falls bekannt',
      locale: 'Wahr, wenn aus den von OneDrive auf dem Computer synchronisierten Ordnern gelesen; dann ist drive «locale» und id der Pfad',
    },
    elenco: {
      titolo: 'Ein Ordner in OneDrive: Unterordner und Dokumente des Klassenbuchs',
      account: 'Das verbundene Konto, mit dem gelesen wird',
      drive: 'Das Laufwerk; ohne das des Kontos',
      cartella: 'Die ID des Ordners; ohne der Stamm',
      driveUscita: 'Das gelesene Laufwerk: wieder mitgeben, um in Ordner zu gehen',
      cartellaUscita: 'Die ID des Ordners; null beim Stamm',
      nome: 'Der Name des Ordners; leer beim Stamm',
      percorso: 'Die Ordner vom Stamm bis zu diesem, ohne ihn',
      superiore: 'Die ID des übergeordneten Ordners; null beim Stamm',
      altri: 'Die Dateien, die keine Dokumente des Klassenbuchs sind, nur gezählt',
      troncato: 'Wahr, wenn der Ordner zu viele Elemente hatte, um alle zu lesen',
      presentazione: {
        titolo: 'OneDrive',
        account: 'Konto',
        cartella: 'Ordner',
        percorso: 'Pfad',
        altri: 'Andere Dateien',
        nome: 'Name',
        genere: 'Art',
        dimensione: 'Grösse',
        modificato: 'Geändert',
      },
    },
    cerca: {
      titolo: 'Die Dokumente des Klassenbuchs auf OneDrive, die neusten zuerst: auf dem Computer synchronisiert, oder eigene und geteilte',
      troncato: 'Wahr, wenn die Suche anhielt, bevor sie überall gesucht hatte',
      motivo: 'Warum sie anhielt: troppi bei zu vielen Treffern, tempo bei Zeitablauf; sonst null',
      presentazione: 'Dokumente des Klassenbuchs auf OneDrive',
    },
    apri: {
      titolo:
        'Öffnet ein auf OneDrive gefundenes Dokument des Klassenbuchs: die auf dem Computer ' +
        'synchronisierte Kopie oder eine heruntergeladene',
      drive: 'Das Laufwerk des Dokuments, wie onedrive.elenco oder onedrive.cerca es geliefert hat',
      id: 'Die ID des Dokuments, wie onedrive.elenco oder onedrive.cerca sie geliefert hat',
    },
  },
  fr: {
    voce: {
      id: 'L’identifiant de l’élément dans son lecteur',
      drive: 'Le lecteur qui le contient : le sien, ou celui de la personne qui l’a partagé',
      genere: 'cartella pour un dossier, regi pour un document du registre',
      dimensione: 'En octets ; zéro pour les dossiers',
      modificato: 'La dernière modification, ISO',
      percorso: 'Les dossiers depuis la racine du lecteur ; vide si Microsoft ne le dit pas',
      figli: 'Combien d’éléments contient un dossier, si on le sait',
      locale: 'Vrai si lu dans les dossiers que OneDrive synchronise sur l’ordinateur ; drive vaut alors « locale » et id est le chemin',
    },
    elenco: {
      titolo: 'Un dossier de OneDrive : sous-dossiers et documents du registre',
      account: 'Le compte connecté avec lequel on lit',
      drive: 'Le lecteur ; sans, celui du compte',
      cartella: 'L’identifiant du dossier ; sans, la racine',
      driveUscita: 'Le lecteur lu : à redonner pour descendre dans les dossiers',
      cartellaUscita: 'L’identifiant du dossier ; null à la racine',
      nome: 'Le nom du dossier ; vide à la racine',
      percorso: 'Les dossiers de la racine jusqu’à celui-ci, exclu',
      superiore: 'L’identifiant du dossier parent ; null à la racine',
      altri: 'Les fichiers qui ne sont pas des documents du registre, seulement comptés',
      troncato: 'Vrai si le dossier contenait trop d’éléments pour tous les lire',
      presentazione: {
        titolo: 'OneDrive',
        account: 'Compte',
        cartella: 'Dossier',
        percorso: 'Chemin',
        altri: 'Autres fichiers',
        nome: 'Nom',
        genere: 'Genre',
        dimensione: 'Taille',
        modificato: 'Modifié',
      },
    },
    cerca: {
      titolo:
        'Les documents du registre sur OneDrive, du plus récent au plus ancien : synchronisés ' +
        'sur l’ordinateur, ou les siens et les partagés',
      troncato: 'Vrai si la recherche s’est arrêtée avant d’avoir tout parcouru',
      motivo: 'Pourquoi elle s’est arrêtée : troppi (trop de résultats), tempo (délai) ou null',
      presentazione: 'Documents du registre sur OneDrive',
    },
    apri: {
      titolo:
        'Ouvre un document du registre trouvé sur OneDrive : la copie synchronisée sur ' +
        'l’ordinateur, ou une copie téléchargée',
      drive: 'Le lecteur du document, tel que donné par onedrive.elenco ou onedrive.cerca',
      id: 'L’identifiant du document, tel que donné par onedrive.elenco ou onedrive.cerca',
    },
  },
  en: {
    voce: {
      id: 'The item’s id in its drive',
      drive: 'The drive that holds it: your own, or that of whoever shared it',
      genere: 'cartella for a folder, regi for a register document',
      dimensione: 'In bytes; zero for folders',
      modificato: 'The last change, ISO',
      percorso: 'The folders from the drive’s root; empty if Microsoft does not say',
      figli: 'How many items a folder holds, if known',
      locale: 'True if read from the folders OneDrive syncs on the computer; then drive is “locale” and id is the path',
    },
    elenco: {
      titolo: 'A OneDrive folder: subfolders and register documents',
      account: 'The connected account used to read',
      drive: 'The drive; without it, the account’s own',
      cartella: 'The folder id; without it, the root',
      driveUscita: 'The drive that was read: pass it back to go into folders',
      cartellaUscita: 'The folder id; null at the root',
      nome: 'The folder name; empty at the root',
      percorso: 'The folders from the root down to this one, excluded',
      superiore: 'The id of the folder above; null at the root',
      altri: 'The files that are not register documents, only counted',
      troncato: 'True if the folder had too many items to read them all',
      presentazione: {
        titolo: 'OneDrive',
        account: 'Account',
        cartella: 'Folder',
        percorso: 'Path',
        altri: 'Other files',
        nome: 'Name',
        genere: 'Kind',
        dimensione: 'Size',
        modificato: 'Modified',
      },
    },
    cerca: {
      titolo: 'The register documents on OneDrive, most recent first: synced on the computer, or own and shared',
      troncato: 'True if the search stopped before looking everywhere',
      motivo: 'Why it stopped: troppi (too many found), tempo (out of time), or null',
      presentazione: 'Register documents on OneDrive',
    },
    apri: {
      titolo:
        'Opens a register document found on OneDrive: the copy synced on the computer, or a ' +
        'downloaded copy',
      drive: 'The document’s drive, as given by onedrive.elenco or onedrive.cerca',
      id: 'The document’s id, as given by onedrive.elenco or onedrive.cerca',
    },
  },
})

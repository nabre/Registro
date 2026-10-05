// I testi del dialogo «Informazioni documento» (`documentInfo.tsx`).

import { catalogo } from '#core/i18n/index.js'
import { PIF, un } from '#core/dominio/lexicon.js'

const it = {
  titolo: 'Informazioni documento',
  aiuto: 'l’anno aperto è un file solo: dentro ci stanno i dati e i documenti. ',
  dentro:
    `Dentro il documento stanno anche i file: le schede di ${un(PIF)}, i rapporti stampati, ` +
    'le scansioni archiviate. Spostare il file vuol dire spostare l’anno intero.',
  cartella: (cartella: string) => `Nella cartella ${cartella}`,
  formato: (versione: number) => `Formato dei dati: versione ${versione}`,
  mostraNellaCartella: 'Mostra nella cartella',
  ricarica: 'Ricarica',
  ricaricaAiuto: 'Rilegge il documento dal disco: serve se lo ha cambiato qualcun altro',
  ricaricati: 'Dati ricaricati dal disco.',
  provvisorio: (nome: string) =>
    `«${nome}» è un anno nuovo non ancora salvato: sta in una ` +
    'cartella provvisoria del programma. Salvalo con nome per scegliere come ' +
    'chiamarlo e dove tenerlo.',
  salvaConNome: 'Salva l’anno con nome…',
  nessunDocumento:
    'Nessun documento aperto: il registro sta lavorando su niente, e quel che si scrive ' +
    'non ha dove andare.',
  sintesi: {
    anni: 'anni',
    classi: 'classi',
    lezioni: 'lezioni',
    piani: 'piani',
    valutazioni: 'valutazioni',
  },
  riferimenti: 'Riferimenti che non tornano',
  eAltri: (quanti: number) => `…e altri ${quanti}.`,
  tuttiTornano: 'Tutti i riferimenti fra classi, lezioni, piani e valutazioni tornano.',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Dokumentinformationen',
    aiuto:
      'das offene Jahr ist eine einzige Datei: Darin stecken die Daten und die Dokumente. ',
    dentro:
      'Im Dokument stecken auch die Dateien: die Blätter der Lernenden, die gedruckten ' +
      'Berichte, die archivierten Scans. Die Datei verschieben heisst, das ganze Jahr verschieben.',
    cartella: (cartella) => `Im Ordner ${cartella}`,
    formato: (versione) => `Datenformat: Version ${versione}`,
    mostraNellaCartella: 'Im Ordner anzeigen',
    ricarica: 'Neu laden',
    ricaricaAiuto:
      'Liest das Dokument neu von der Festplatte: nötig, wenn jemand anderes es geändert hat',
    ricaricati: 'Daten von der Festplatte neu geladen.',
    provvisorio: (nome) =>
      `«${nome}» ist ein neues, noch nicht gespeichertes Jahr: Es liegt in einem provisorischen ` +
      'Ordner des Programms. Speichere es unter einem Namen, um zu wählen, wie es heisst und ' +
      'wo es liegt.',
    salvaConNome: 'Schuljahr speichern unter…',
    nessunDocumento:
      'Kein Dokument offen: Das Klassenbuch arbeitet mit nichts, und was man schreibt, hat ' +
      'keinen Ort.',
    sintesi: {
      anni: 'Jahre',
      classi: 'Klassen',
      lezioni: 'Stunden',
      piani: 'Pläne',
      valutazioni: 'Beurteilungen',
    },
    riferimenti: 'Verweise, die nicht aufgehen',
    eAltri: (quanti) => `…und ${quanti} weitere.`,
    tuttiTornano:
      'Alle Verweise zwischen Klassen, Stunden, Plänen und Beurteilungen gehen auf.',
  },
  fr: {
    titolo: 'Informations sur le document',
    aiuto:
      'l’année ouverte est un seul fichier : il contient les données et les documents. ',
    dentro:
      'Le document contient aussi les fichiers : les fiches des personnes en formation, les ' +
      'rapports imprimés, les scans archivés. Déplacer le fichier, c’est déplacer ' +
      'l’année entière.',
    cartella: (cartella) => `Dans le dossier ${cartella}`,
    formato: (versione) => `Format des données : version ${versione}`,
    mostraNellaCartella: 'Afficher dans le dossier',
    ricarica: 'Recharger',
    ricaricaAiuto:
      'Relit le document depuis le disque : utile si quelqu’un d’autre l’a modifié',
    ricaricati: 'Données rechargées depuis le disque.',
    provvisorio: (nome) =>
      `« ${nome} » est une nouvelle année pas encore enregistrée : elle se trouve dans un ` +
      'dossier provisoire du programme. Enregistre-la sous un nom pour choisir comment ' +
      'l’appeler et où la garder.',
    salvaConNome: 'Enregistrer l’année sous…',
    nessunDocumento:
      'Aucun document ouvert : le registre ne travaille sur rien, et ce qu’on écrit n’a nulle ' +
      'part où aller.',
    sintesi: {
      anni: 'années',
      classi: 'classes',
      lezioni: 'leçons',
      piani: 'plans',
      valutazioni: 'évaluations',
    },
    riferimenti: 'Références qui ne collent pas',
    eAltri: (quanti) => `…et ${quanti} autres.`,
    tuttiTornano:
      'Toutes les références entre classes, leçons, plans et évaluations collent.',
  },
  en: {
    titolo: 'Document information',
    aiuto: 'the open year is a single file: it holds the data and the documents. ',
    dentro:
      'The document also holds the files: the learner sheets, the printed reports, the ' +
      'archived scans. Moving the file means moving the whole year.',
    cartella: (cartella) => `In the folder ${cartella}`,
    formato: (versione) => `Data format: version ${versione}`,
    mostraNellaCartella: 'Show in folder',
    ricarica: 'Reload',
    ricaricaAiuto: 'Reads the document again from disk: useful if someone else has changed it',
    ricaricati: 'Data reloaded from disk.',
    provvisorio: (nome) =>
      `“${nome}” is a new year that has not been saved yet: it sits in a temporary folder of ` +
      'the program. Save it with a name to choose what to call it and where to keep it.',
    salvaConNome: 'Save the year as…',
    nessunDocumento:
      'No document open: the register is working on nothing, and whatever you write has ' +
      'nowhere to go.',
    sintesi: {
      anni: 'years',
      classi: 'classes',
      lezioni: 'lessons',
      piani: 'plans',
      valutazioni: 'assessments',
    },
    riferimenti: 'References that don’t add up',
    eAltri: (quanti) => `…and ${quanti} more.`,
    tuttiTornano: 'All references between classes, lessons, plans and assessments add up.',
  },
})

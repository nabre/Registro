// Errori dei file. Minuscoli perché finiscono in coda a un altro messaggio.

import { catalogo } from '../i18n/index.js'

const it = {
  nonTrovato: (dove: string) => `file non trovato: ${dove}`,
  giàQualcosa: (dove: string) => `c'è già qualcosa: ${dove}`,
  permessoNegato: (dove: string) => `permesso negato: ${dove}`,
  èUnaCartella: (dove: string) => `è una cartella: ${dove}`,
  percorsoIgnoto: 'percorso ignoto',
}

export const testi = catalogo(it, {
  de: {
    nonTrovato: (dove) => `Datei nicht gefunden: ${dove}`,
    giàQualcosa: (dove) => `dort ist schon etwas: ${dove}`,
    permessoNegato: (dove) => `Zugriff verweigert: ${dove}`,
    èUnaCartella: (dove) => `das ist ein Ordner: ${dove}`,
    percorsoIgnoto: 'unbekannter Pfad',
  },
  fr: {
    nonTrovato: (dove) => `fichier introuvable : ${dove}`,
    giàQualcosa: (dove) => `il y a déjà quelque chose : ${dove}`,
    permessoNegato: (dove) => `accès refusé : ${dove}`,
    èUnaCartella: (dove) => `c’est un dossier : ${dove}`,
    percorsoIgnoto: 'chemin inconnu',
  },
  en: {
    nonTrovato: (dove) => `file not found: ${dove}`,
    giàQualcosa: (dove) => `something is already there: ${dove}`,
    permessoNegato: (dove) => `permission denied: ${dove}`,
    èUnaCartella: (dove) => `it is a folder: ${dove}`,
    percorsoIgnoto: 'unknown path',
  },
})

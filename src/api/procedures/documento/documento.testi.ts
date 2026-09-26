// I testi delle procedure di `documento`. Si leggono al momento dell'uso, mai
// al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  comune: {
    percorso: 'Il percorso del documento d’anno sul disco',
  },
  apri: {
    titolo: 'Apre un documento d’anno; senza percorso apre il dialogo del sistema',
  },
  chiudi: {
    titolo: 'Chiude l’anno aperto e libera il file',
  },
  dimentica: {
    titolo: 'Toglie un documento dall’elenco; il file sul disco non si tocca',
  },
  preferito: {
    titolo: 'Mette da parte un documento, o lo lascia tornare fra i recenti',
    preferito: 'Acceso lo mette da parte, spento lo rimette fra i recenti',
  },
}

export const testi = catalogo(it, {
  de: {
    comune: {
      percorso: 'Der Pfad des Jahresdokuments auf der Festplatte',
    },
    apri: {
      titolo: 'Öffnet ein Jahresdokument; ohne Pfad öffnet es den Dialog des Systems',
    },
    chiudi: {
      titolo: 'Schliesst das offene Jahr und gibt die Datei frei',
    },
    dimentica: {
      titolo: 'Entfernt ein Dokument aus der Liste; die Datei auf der Festplatte bleibt unberührt',
    },
    preferito: {
      titolo: 'Legt ein Dokument beiseite oder lässt es zu den zuletzt verwendeten zurückkehren',
      preferito:
        'Eingeschaltet legt es beiseite, ausgeschaltet kommt es zu den zuletzt verwendeten zurück',
    },
  },
  fr: {
    comune: {
      percorso: 'Le chemin du document de l’année sur le disque',
    },
    apri: {
      titolo: 'Ouvre un document de l’année ; sans chemin, ouvre la boîte de dialogue du système',
    },
    chiudi: {
      titolo: 'Ferme l’année ouverte et libère le fichier',
    },
    dimentica: {
      titolo: 'Retire un document de la liste ; le fichier sur le disque n’est pas touché',
    },
    preferito: {
      titolo: 'Met un document de côté, ou le laisse revenir parmi les récents',
      preferito: 'Activé, le met de côté ; désactivé, le remet parmi les récents',
    },
  },
  en: {
    comune: {
      percorso: 'The path of the year document on disk',
    },
    apri: {
      titolo: 'Opens a year document; without a path it opens the system dialog',
    },
    chiudi: {
      titolo: 'Closes the open year and releases the file',
    },
    dimentica: {
      titolo: 'Removes a document from the list; the file on disk is left untouched',
    },
    preferito: {
      titolo: 'Sets a document aside, or lets it go back among the recent ones',
      preferito: 'On sets it aside, off puts it back among the recent ones',
    },
  },
})

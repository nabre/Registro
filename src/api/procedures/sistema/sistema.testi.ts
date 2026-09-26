// I testi delle procedure di `sistema`. Si leggono al momento dell'uso, mai al
// caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  apriCartella: {
    titolo: 'Mostra nel gestore file la cartella del documento',
  },
  chiama: {
    titolo: 'Compone un numero con il programma che il sistema tiene per le chiamate',
    numero: 'Il numero come sta in anagrafica',
  },
  messaggio: {
    titolo: 'Mostra una finestra del sistema con una frase dentro',
    livello: 'Che finestra: informazione, avviso o errore',
  },
  scrivi: {
    titolo: 'Apre il programma di posta su un messaggio nuovo a quell’indirizzo',
    indirizzo: 'L’indirizzo di posta a cui scrivere',
  },
}

export const testi = catalogo(it, {
  de: {
    apriCartella: {
      titolo: 'Zeigt den Ordner des Dokuments im Dateimanager',
    },
    chiama: {
      titolo: 'Wählt eine Nummer mit dem Programm, das das System für Anrufe vorsieht',
      numero: 'Die Nummer, wie sie in den Personalien steht',
    },
    messaggio: {
      titolo: 'Zeigt ein Fenster des Systems mit einem Satz darin',
      livello: 'Welches Fenster: Information, Warnung oder Fehler',
    },
    scrivi: {
      titolo: 'Öffnet das E-Mail-Programm mit einer neuen Nachricht an diese Adresse',
      indirizzo: 'Die E-Mail-Adresse, an die geschrieben wird',
    },
  },
  fr: {
    apriCartella: {
      titolo: 'Affiche le dossier du document dans le gestionnaire de fichiers',
    },
    chiama: {
      titolo: 'Compose un numéro avec le programme que le système réserve aux appels',
      numero: 'Le numéro tel qu’il figure dans les données personnelles',
    },
    messaggio: {
      titolo: 'Affiche une fenêtre du système avec une phrase dedans',
      livello: 'Quelle fenêtre : information, avertissement ou erreur',
    },
    scrivi: {
      titolo: 'Ouvre le programme de messagerie sur un nouveau message à cette adresse',
      indirizzo: 'L’adresse e-mail à laquelle écrire',
    },
  },
  en: {
    apriCartella: {
      titolo: 'Shows the document’s folder in the file manager',
    },
    chiama: {
      titolo: 'Dials a number with the program the system uses for calls',
      numero: 'The number as it appears in the personal details',
    },
    messaggio: {
      titolo: 'Shows a system window with a sentence in it',
      livello: 'Which window: information, warning or error',
    },
    scrivi: {
      titolo: 'Opens the mail program on a new message to that address',
      indirizzo: 'The email address to write to',
    },
  },
})

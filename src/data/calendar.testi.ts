// I testi di `calendar.ts`: perché un calendario non è arrivato. L'indirizzo
// non compare mai, perché spesso contiene un gettone.

import { catalogo } from '../i18n/index.js'

const it = {
  nonRisponde: 'Il calendario non risponde: controllare il collegamento e l’indirizzo.',
  serverHaRisposto: (stato: number) => `Il server del calendario ha risposto ${stato}.`,
  troppoGrande: 'Il calendario è troppo grande per essere un orario.',
  fileNonSiApre: 'Il file del calendario non si apre: è stato spostato o rinominato?',
  fileTroppoGrande: 'Il file è troppo grande per essere un orario.',
  nonIcs: 'Quel che è arrivato non è un calendario ICS.',
  manca: 'Manca il calendario: un indirizzo o un file .ics.',
  nessunAnno: 'Nessun anno aperto.',
  copiaNonScritta: 'La copia del calendario non si è potuta scrivere nel documento.',
}

export const testi = catalogo(it, {
  de: {
    nonRisponde: 'Der Kalender antwortet nicht: Prüfe die Verbindung und die Adresse.',
    serverHaRisposto: (stato) => `Der Kalenderserver hat mit ${stato} geantwortet.`,
    troppoGrande: 'Der Kalender ist zu gross, um ein Stundenplan zu sein.',
    fileNonSiApre:
      'Die Kalenderdatei lässt sich nicht öffnen: Wurde sie verschoben oder umbenannt?',
    fileTroppoGrande: 'Die Datei ist zu gross, um ein Stundenplan zu sein.',
    nonIcs: 'Was angekommen ist, ist kein ICS-Kalender.',
    manca: 'Der Kalender fehlt: eine Adresse oder eine .ics-Datei.',
    nessunAnno: 'Kein Schuljahr geöffnet.',
    copiaNonScritta: 'Die Kopie des Kalenders konnte nicht ins Dokument geschrieben werden.',
  },
  fr: {
    nonRisponde: 'Le calendrier ne répond pas : vérifie la connexion et l’adresse.',
    serverHaRisposto: (stato) => `Le serveur du calendrier a répondu ${stato}.`,
    troppoGrande: 'Le calendrier est trop grand pour être un horaire.',
    fileNonSiApre: 'Le fichier du calendrier ne s’ouvre pas : a-t-il été déplacé ou renommé ?',
    fileTroppoGrande: 'Le fichier est trop grand pour être un horaire.',
    nonIcs: 'Ce qui est arrivé n’est pas un calendrier ICS.',
    manca: 'Il manque le calendrier : une adresse ou un fichier .ics.',
    nessunAnno: 'Aucune année scolaire ouverte.',
    copiaNonScritta: 'La copie du calendrier n’a pas pu être écrite dans le document.',
  },
  en: {
    nonRisponde: 'The calendar isn’t responding: check the connection and the address.',
    serverHaRisposto: (stato) => `The calendar server responded with ${stato}.`,
    troppoGrande: 'The calendar is too large to be a timetable.',
    fileNonSiApre: 'The calendar file won’t open: has it been moved or renamed?',
    fileTroppoGrande: 'The file is too large to be a timetable.',
    nonIcs: 'What arrived isn’t an ICS calendar.',
    manca: 'The calendar is missing: an address or an .ics file.',
    nessunAnno: 'No school year open.',
    copiaNonScritta: 'The calendar copy couldn’t be written to the document.',
  },
})

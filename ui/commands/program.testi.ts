// I testi dei comandi del programma (`program.ts`): file, finestra,
// manutenzione. La guida cita i nomi dei pulsanti fra virgolette: cambiandone
// uno va cambiato anche là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'

const it = {
  // File.
  nuovoAnnoAiuto:
    'Un anno nuovo, in un documento suo: si apre subito, e lo salvi con nome quando vuoi',
  apri: 'Apri un anno…',
  apriAiuto: 'Un altro documento «.regi», scelto dal disco',
  apriDaOneDrive: 'Apri da OneDrive…',
  apriDaOneDriveAiuto: 'Un documento «.regi» nel OneDrive di un account Microsoft collegato',
  importaRegistro: 'Importa da un altro registro…',
  importaRegistroAiuto:
    'Da un altro documento «.regi»: impostazioni, materie, classi con persone e corsi, ' +
    'piani e calendari. Mai lezioni né voti',
  salvaConNomeAiuto:
    'L’anno nuovo non è ancora salvato: scegli come chiamarlo e in che cartella tenerlo',
  salvaAiuto: 'Il registro salva da sé: questo smette di aspettare, e lo dice',
  ricarica: 'Ricarica',
  ricaricaAiuto:
    'Rilegge il documento dal disco: serve se lo ha toccato qualcun altro',
  chiudiAiuto:
    'Chiude il documento e lascia il file libero: serve per farlo salire su OneDrive, ' +
    'o per riprenderlo da un altro computer',
  nessunDocumento: 'Non c’è nessun documento aperto.',
  cartella: 'Apri la cartella del file',
  cartellaAiuto:
    'Apre la cartella in cui sta il file aperto, con il file già evidenziato',
  informazioni: 'Informazioni documento…',
  informazioniAiuto:
    'Quale file è aperto, dove sta, che cosa contiene e se i riferimenti tornano',
  modificaAnno: 'Modifica l’anno',
  modificaAnnoAiuto: 'Date, semestri e settimane dell’anno in uso',
  pause: 'Vacanze e sospensioni',
  // La finestra.
  ingrandisci: 'Ingrandisci',
  ingrandisciAiuto: 'Testo e riquadri più grandi, di un passo',
  riduci: 'Riduci',
  riduciAiuto: 'Testo e riquadri più piccoli, di un passo: ce ne sta di più',
  dimensioneNormale: 'Dimensione normale',
  dimensioneNormaleAiuto: 'Rimette la finestra alla sua misura',
  schermoIntero: 'Schermo intero',
  schermoInteroAiuto:
    'La finestra di chi insegna occupa tutto lo schermo — non è lo schermo per la classe',
  esci: 'Esci dal registro',
  esciAiuto:
    'Spegne il registro del tutto, icona accanto all’orologio compresa. ' +
    'Quel che si è scritto è già salvato',
  // Manutenzione.
  ripara: 'Ripara il registro',
  riparaAiuto:
    'Rimette a posto i riferimenti rotti che si correggono senza perdere niente',
  nienteDaRiparare: 'Non c’è niente da riparare.',
}

export const testi = catalogo(it, {
  de: {
    nuovoAnnoAiuto:
      'Ein neues Schuljahr in einem eigenen Dokument: Es öffnet sich sofort, und du speicherst ' +
      'es unter einem Namen, wann du willst',
    apri: 'Schuljahr öffnen…',
    apriAiuto: 'Ein anderes «.regi»-Dokument, ausgewählt auf der Festplatte',
    apriDaOneDrive: 'Aus OneDrive öffnen…',
    apriDaOneDriveAiuto: 'Ein «.regi»-Dokument im OneDrive eines verbundenen Microsoft-Kontos',
    importaRegistro: 'Aus einem anderen Klassenbuch importieren…',
    importaRegistroAiuto:
      'Aus einem anderen «.regi»-Dokument: Einstellungen, Fächer, Klassen mit Personen und ' +
      'Kursen, Pläne und Kalender. Nie Stunden oder Noten',
    salvaConNomeAiuto:
      'Das neue Schuljahr ist noch nicht gespeichert: Wähle, wie es heissen und in welchem ' +
      'Ordner es liegen soll',
    salvaAiuto:
      'Das Klassenbuch speichert von selbst: Dieser Befehl wartet nicht länger und meldet es',
    ricarica: 'Neu laden',
    ricaricaAiuto:
      'Liest das Dokument neu von der Festplatte: nützlich, wenn jemand anderes es geändert hat',
    chiudiAiuto:
      'Schliesst das Dokument und gibt die Datei frei: So kann sie zu OneDrive hochgeladen ' +
      'oder auf einem anderen Computer weiterbearbeitet werden',
    nessunDocumento: 'Es ist kein Dokument geöffnet.',
    cartella: 'Ordner der Datei öffnen',
    cartellaAiuto:
      'Öffnet den Ordner der offenen Datei, mit der Datei schon markiert',
    informazioni: 'Dokumentinformationen…',
    informazioniAiuto:
      'Welche Datei offen ist, wo sie liegt, was sie enthält und ob die Verweise aufgehen',
    modificaAnno: 'Schuljahr bearbeiten',
    modificaAnnoAiuto: 'Daten, Semester und Wochen des laufenden Schuljahrs',
    pause: 'Ferien und Unterbrüche',
    ingrandisci: 'Vergrössern',
    ingrandisciAiuto: 'Text und Felder um eine Stufe grösser',
    riduci: 'Verkleinern',
    riduciAiuto: 'Text und Felder um eine Stufe kleiner: Es passt mehr hinein',
    dimensioneNormale: 'Normale Grösse',
    dimensioneNormaleAiuto: 'Setzt das Fenster auf seine Grösse zurück',
    schermoIntero: 'Vollbild',
    schermoInteroAiuto:
      'Das Fenster der Lehrperson füllt den ganzen Bildschirm — nicht der Bildschirm für die ' +
      'Klasse',
    esci: 'Klassenbuch beenden',
    esciAiuto:
      'Beendet das Klassenbuch ganz, samt Symbol neben der Uhr. ' +
      'Was geschrieben wurde, ist schon gespeichert',
    ripara: 'Klassenbuch reparieren',
    riparaAiuto:
      'Behebt kaputte Verweise, die sich ohne Verlust korrigieren lassen',
    nienteDaRiparare: 'Es gibt nichts zu reparieren.',
  },
  fr: {
    nuovoAnnoAiuto:
      'Une nouvelle année, dans son propre document : elle s’ouvre tout de suite, et tu ' +
      'l’enregistres sous un nom quand tu veux',
    apri: 'Ouvrir une année…',
    apriAiuto: 'Un autre document « .regi », choisi sur le disque',
    apriDaOneDrive: 'Ouvrir depuis OneDrive…',
    apriDaOneDriveAiuto: 'Un document « .regi » dans le OneDrive d’un compte Microsoft connecté',
    importaRegistro: 'Importer d’un autre registre…',
    importaRegistroAiuto:
      'D’un autre document « .regi » : paramètres, branches, classes avec personnes et ' +
      'cours, plans et calendriers. Jamais de leçons ni de notes',
    salvaConNomeAiuto:
      'La nouvelle année n’est pas encore enregistrée : choisis son nom et le dossier où la garder',
    salvaAiuto:
      'Le registre enregistre tout seul : cette commande n’attend plus, et le signale',
    ricarica: 'Recharger',
    ricaricaAiuto:
      'Relit le document sur le disque : utile si quelqu’un d’autre l’a modifié',
    chiudiAiuto:
      'Ferme le document et libère le fichier : pour qu’il monte sur OneDrive, ou pour le ' +
      'reprendre depuis un autre ordinateur',
    nessunDocumento: 'Aucun document n’est ouvert.',
    cartella: 'Ouvrir le dossier du fichier',
    cartellaAiuto:
      'Ouvre le dossier du fichier ouvert, avec le fichier déjà sélectionné',
    informazioni: 'Informations sur le document…',
    informazioniAiuto:
      'Quel fichier est ouvert, où il se trouve, ce qu’il contient et si les références collent',
    modificaAnno: 'Modifier l’année',
    modificaAnnoAiuto: 'Dates, semestres et semaines de l’année en cours',
    pause: 'Vacances et interruptions',
    ingrandisci: 'Agrandir',
    ingrandisciAiuto: 'Texte et cadres plus grands, d’un cran',
    riduci: 'Réduire',
    riduciAiuto:
      'Texte et cadres plus petits, d’un cran : on en voit davantage',
    dimensioneNormale: 'Taille normale',
    dimensioneNormaleAiuto: 'Remet la fenêtre à sa taille',
    schermoIntero: 'Plein écran',
    schermoInteroAiuto:
      'La fenêtre de l’enseignant occupe tout l’écran — ce n’est pas l’écran pour la classe',
    esci: 'Quitter le registre',
    esciAiuto:
      'Éteint complètement le registre, icône près de l’horloge comprise. ' +
      'Ce qui a été écrit est déjà enregistré',
    ripara: 'Réparer le registre',
    riparaAiuto:
      'Remet en ordre les références cassées qui se corrigent sans rien perdre',
    nienteDaRiparare: 'Il n’y a rien à réparer.',
  },
  en: {
    nuovoAnnoAiuto:
      'A new year, in a document of its own: it opens straight away, and you save it under a ' +
      'name whenever you like',
    apri: 'Open a year…',
    apriAiuto: 'Another “.regi” document, chosen from the disk',
    apriDaOneDrive: 'Open from OneDrive…',
    apriDaOneDriveAiuto: 'A “.regi” document in the OneDrive of a connected Microsoft account',
    importaRegistro: 'Import from another register…',
    importaRegistroAiuto:
      'From another “.regi” document: settings, subjects, classes with people and courses, ' +
      'plans and calendars. Never lessons or grades',
    salvaConNomeAiuto:
      'The new year is not saved yet: choose what to call it and which folder to keep it in',
    salvaAiuto:
      'The register saves by itself: this saves right away instead of waiting, and says so',
    ricarica: 'Reload',
    ricaricaAiuto:
      'Reads the document again from the disk: useful if someone else has changed it',
    chiudiAiuto:
      'Closes the document and frees the file: so it can upload to OneDrive, or be picked up ' +
      'on another computer',
    nessunDocumento: 'There is no document open.',
    cartella: 'Open the file’s folder',
    cartellaAiuto:
      'Opens the folder the open file is in, with the file already highlighted',
    informazioni: 'Document information…',
    informazioniAiuto:
      'Which file is open, where it is, what it holds and whether the references add up',
    modificaAnno: 'Edit the year',
    modificaAnnoAiuto: 'Dates, semesters and weeks of the year in use',
    pause: 'Holidays and breaks',
    ingrandisci: 'Zoom in',
    ingrandisciAiuto: 'Text and panels one step larger',
    riduci: 'Zoom out',
    riduciAiuto: 'Text and panels one step smaller: more fits in',
    dimensioneNormale: 'Actual size',
    dimensioneNormaleAiuto: 'Puts the window back to its size',
    schermoIntero: 'Full screen',
    schermoInteroAiuto:
      'The teacher’s window fills the whole screen — this is not the class screen',
    esci: 'Quit the register',
    esciAiuto:
      'Shuts the register down completely, including the icon next to the clock. ' +
      'Whatever has been written is already saved',
    ripara: 'Repair the register',
    riparaAiuto:
      'Fixes broken references that can be corrected without losing anything',
    nienteDaRiparare: 'There is nothing to repair.',
  },
})

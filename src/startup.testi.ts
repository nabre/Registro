// I testi di `startup.ts`: avvio, traslochi, anno occupato, posta, anno nuovo.
// «Regiclass» in testa agli avvisi è il marchio e non si traduce.

import { catalogo } from './i18n/index.js'
import { plurale } from './domain/text.js'

/** Il nome tedesco del Ticino, che dai dati arriva in italiano (come in `ui/forms/schoolCalendar.testi.ts`). */
const tessin = (cantone: string): string => (cantone === 'Ticino' ? 'Tessin' : cantone)

const it = {
  // ------------------------------------------------------ l'anno occupato
  occupato: (anno: string, chi: string) => `L’anno «${anno}» risulta già aperto su ${chi}.`,
  /** `quando` è l'istante in cui l'altro l'ha aperto, già scritto; vuoto se non si sa. */
  occupatoDettaglio: (quando: string) =>
    `${quando ? `Aperto il ${quando}. ` : ''}Se lo apri anche qui, chi salva per ultimo ` +
    'copre il lavoro dell’altro. Può anche essere un registro chiuso male: in quel caso ' +
    'aprirlo è la cosa giusta.',
  apriLoStesso: 'Apri lo stesso',

  // ------------------------------------------------ le fasi dell'avvio
  controllo: 'Controllo i file dell’anno…',
  leggo: 'Leggo il documento dell’anno…',
  preparo: 'Preparo il registro…',
  finestre: 'Preparo le finestre…',
  apro: 'Apro il registro…',

  // --------------------------------------------------------- i traslochi
  migratoUno: (corrente: string) =>
    `Regiclass: i dati sono ora nella cartella «${corrente}», una per anno scolastico.`,
  migratiMolti: (anni: number, corrente: string) =>
    `Regiclass: i dati sono stati divisi in ${anni} cartelle, una per anno scolastico. ` +
    `In uso: «${corrente}».`,
  impacchettatoUno: (documento: string) =>
    `Regiclass: i dati dell’anno stanno ora nel documento «${documento}». ` +
    'La cartella «dati» di prima è nel cestino.',
  impacchettatiMolti: (anni: number, estensione: string) =>
    `Regiclass: ${anni} anni sono ora altrettanti documenti «${estensione}». ` +
    'Le cartelle «dati» di prima sono nel cestino.',
  riordinati: (n: number) =>
    `Regiclass: ${n} documenti rimessi in ordine sotto «archivio/» ed ` +
    '«esportazioni/», per classe, corso e documento.',
  inglobati: (n: number, documento: string) =>
    `Regiclass: ${n} documenti dell’anno sono ora dentro «${documento}». ` +
    'Le cartelle di prima sono nel cestino.',
  traslocoFallito:
    'Regiclass: non ho potuto rimettere in ordine tutti i documenti archiviati. ' +
    'Chiudi i programmi che tengono aperti i file e riapri il registro.',

  // -------------------------------------------------------------- la posta
  posta: (testo: string) => `Regiclass — posta: ${testo}`,
  azzera: 'Azzera',
  azzeraDomanda: 'Azzerare la posta del registro?',
  azzeraDettaglio:
    'Toglie la password e il gettone dal portachiavi, i gettoni in memoria e tutte le ' +
    'impostazioni registroDocenti.posta.* (indirizzo, tenant, ID applicazione, invio ' +
    'diretto). Il collegamento andrà rifatto da capo.',
  senzaCartella: 'Regiclass: nessuna cartella di lavoro aperta.',

  // ------------------------------------------------------------ l'anno nuovo
  calendarioUfficiale: (cantone: string) => `calendario ufficiale del ${cantone}`,
  vacanzeDel: (calendario: string) => `vacanze e festivi del ${calendario}`,
  scegliDate: 'Scegli le date…',
  scegliDateDescrizione: 'imposta inizio e fine a mano',
  nuovoAnno: 'Nuovo anno scolastico',
  formato: 'Formato AAAA-MM-GG',
  dataVera: 'Serve una data vera, scritta AAAA-MM-GG',
  inizioAnno: 'Inizio dell’anno',
  fineAnno: 'Fine dell’anno',
  importaSi: 'Sì, scelgo da quale',
  importaSiDescrizione: 'appena l’anno è nato si apre la finestra dell’importazione',
  importaNo: 'No, parto da zero',
  importaNoDescrizione: 'si può sempre fare dopo, da File › Importa da un altro registro',
  importaDomanda: 'Importare classi, corsi e impostazioni da un altro registro?',

  // --------------------------------------------------- l'anno da salvare
  nonSalvato: (nome: string) => `L’anno «${nome}» non è ancora stato salvato.`,
  nonSalvatoDettaglio:
    'È un anno nuovo, e sta in una cartella provvisoria del programma. ' +
    'Salvalo con nome per sceglierne il posto, oppure buttalo.',
  salvaConNome: 'Salva con nome…',
  buttaAnno: 'Butta l’anno',
  nessunAnnoDaSalvare: 'Non c’è nessun anno aperto da salvare.',
  salvaAnnoConNome: (nome: string) => `Salva l’anno ${nome} con nome`,
  salvatoIn: (percorso: string) => `Anno salvato in ${percorso}`,
}

export const testi = catalogo(it, {
  de: {
    occupato: (anno, chi) => `Das Schuljahr «${anno}» ist bereits auf ${chi} geöffnet.`,
    occupatoDettaglio: (quando) =>
      `${quando ? `Geöffnet am ${quando}. ` : ''}Wenn du es auch hier öffnest, überschreibt, ` +
      'wer zuletzt speichert, die Arbeit des anderen. Es kann auch ein Klassenbuch sein, das ' +
      'nicht richtig geschlossen wurde: Dann ist Öffnen das Richtige.',
    apriLoStesso: 'Trotzdem öffnen',
    controllo: 'Die Dateien des Schuljahrs werden geprüft…',
    leggo: 'Das Dokument des Schuljahrs wird gelesen…',
    preparo: 'Das Klassenbuch wird vorbereitet…',
    finestre: 'Die Fenster werden vorbereitet…',
    apro: 'Das Klassenbuch wird geöffnet…',
    migratoUno: (corrente) =>
      `Regiclass: Die Daten sind jetzt im Ordner «${corrente}», einer pro Schuljahr.`,
    migratiMolti: (anni, corrente) =>
      `Regiclass: Die Daten wurden auf ${anni} Ordner aufgeteilt, einer pro Schuljahr. ` +
      `In Gebrauch: «${corrente}».`,
    impacchettatoUno: (documento) =>
      `Regiclass: Die Daten des Schuljahrs sind jetzt im Dokument «${documento}». ` +
      'Der bisherige Ordner «dati» ist im Papierkorb.',
    impacchettatiMolti: (anni, estensione) =>
      `Regiclass: ${anni} Schuljahre sind jetzt ebenso viele «${estensione}»-Dokumente. ` +
      'Die bisherigen Ordner «dati» sind im Papierkorb.',
    riordinati: (n) =>
      `Regiclass: ${plurale(n, 'Dokument', 'Dokumente')} unter «archivio/» und ` +
      '«esportazioni/» neu geordnet, nach Klasse, Kurs und Dokument.',
    inglobati: (n, documento) =>
      `Regiclass: ${plurale(n, 'Dokument', 'Dokumente')} des Schuljahrs sind jetzt in ` +
      `«${documento}». Die bisherigen Ordner sind im Papierkorb.`,
    traslocoFallito:
      'Regiclass: Ich konnte nicht alle abgelegten Dokumente neu ordnen. ' +
      'Schliesse die Programme, die die Dateien offen halten, und öffne das Klassenbuch neu.',
    posta: (testo) => `Regiclass — E-Mail: ${testo}`,
    azzera: 'Zurücksetzen',
    azzeraDomanda: 'E-Mail des Klassenbuchs zurücksetzen?',
    azzeraDettaglio:
      'Entfernt das Passwort und das Token aus dem Schlüsselbund, die Tokens im Speicher und ' +
      'alle Einstellungen registroDocenti.posta.* (Adresse, Tenant, Anwendungs-ID, direkter ' +
      'Versand). Die Verbindung muss danach neu eingerichtet werden.',
    senzaCartella: 'Regiclass: Kein Arbeitsordner geöffnet.',
    calendarioUfficiale: (cantone) => `offizieller Schulkalender des Kantons ${tessin(cantone)}`,
    vacanzeDel: (calendario) => `Ferien und Feiertage aus dem ${calendario}`,
    scegliDate: 'Daten auswählen…',
    scegliDateDescrizione: 'Beginn und Ende von Hand festlegen',
    nuovoAnno: 'Neues Schuljahr',
    formato: 'Format JJJJ-MM-TT',
    dataVera: 'Es braucht ein echtes Datum im Format JJJJ-MM-TT',
    inizioAnno: 'Beginn des Schuljahrs',
    fineAnno: 'Ende des Schuljahrs',
    importaSi: 'Ja, ich wähle aus welchem',
    importaSiDescrizione: 'sobald das Schuljahr erstellt ist, öffnet sich das Importfenster',
    importaNo: 'Nein, ich beginne von vorn',
    importaNoDescrizione:
      'das geht auch später, über Datei › Aus einem anderen Klassenbuch importieren',
    importaDomanda: 'Klassen, Kurse und Einstellungen aus einem anderen Klassenbuch importieren?',
    nonSalvato: (nome) => `Das Schuljahr «${nome}» ist noch nicht gespeichert.`,
    nonSalvatoDettaglio:
      'Es ist ein neues Schuljahr und liegt in einem provisorischen Ordner des Programms. ' +
      'Speichere es unter einem Namen, um seinen Ort zu wählen, oder verwirf es.',
    salvaConNome: 'Speichern unter…',
    buttaAnno: 'Schuljahr verwerfen',
    nessunAnnoDaSalvare: 'Es ist kein Schuljahr zum Speichern geöffnet.',
    salvaAnnoConNome: (nome) => `Schuljahr ${nome} speichern unter`,
    salvatoIn: (percorso) => `Schuljahr gespeichert in ${percorso}`,
  },
  fr: {
    occupato: (anno, chi) => `L’année « ${anno} » est déjà ouverte sur ${chi}.`,
    occupatoDettaglio: (quando) =>
      `${quando ? `Ouverte le ${quando}. ` : ''}Si tu l’ouvres aussi ici, celui qui enregistre ` +
      'en dernier écrase le travail de l’autre. Ce peut aussi être un registre mal fermé : ' +
      'dans ce cas, l’ouvrir est la bonne chose à faire.',
    apriLoStesso: 'Ouvrir quand même',
    controllo: 'Je vérifie les fichiers de l’année…',
    leggo: 'Je lis le document de l’année…',
    preparo: 'Je prépare le registre…',
    finestre: 'Je prépare les fenêtres…',
    apro: 'J’ouvre le registre…',
    migratoUno: (corrente) =>
      `Regiclass : les données sont maintenant dans le dossier « ${corrente} », ` +
      'un par année scolaire.',
    migratiMolti: (anni, corrente) =>
      `Regiclass : les données ont été réparties en ${anni} dossiers, un par année scolaire. ` +
      `En cours : « ${corrente} ».`,
    impacchettatoUno: (documento) =>
      `Regiclass : les données de l’année sont maintenant dans le document « ${documento} ». ` +
      'L’ancien dossier « dati » est dans la corbeille.',
    impacchettatiMolti: (anni, estensione) =>
      `Regiclass : ${anni} années sont maintenant autant de documents « ${estensione} ». ` +
      'Les anciens dossiers « dati » sont dans la corbeille.',
    riordinati: (n) =>
      `Regiclass : ${plurale(n, 'document remis', 'documents remis')} en ordre sous ` +
      '« archivio/ » et « esportazioni/ », par classe, cours et document.',
    inglobati: (n, documento) =>
      `Regiclass : ${plurale(n, 'document', 'documents')} de l’année sont maintenant dans ` +
      `« ${documento} ». Les anciens dossiers sont dans la corbeille.`,
    traslocoFallito:
      'Regiclass : je n’ai pas pu remettre en ordre tous les documents archivés. ' +
      'Ferme les programmes qui gardent les fichiers ouverts et rouvre le registre.',
    posta: (testo) => `Regiclass — messagerie : ${testo}`,
    azzera: 'Réinitialiser',
    azzeraDomanda: 'Réinitialiser la messagerie du registre ?',
    azzeraDettaglio:
      'Retire le mot de passe et le jeton du trousseau, les jetons en mémoire et tous les ' +
      'paramètres registroDocenti.posta.* (adresse, tenant, ID d’application, envoi ' +
      'direct). La connexion devra être refaite depuis le début.',
    senzaCartella: 'Regiclass : aucun dossier de travail ouvert.',
    calendarioUfficiale: (cantone) => `calendrier scolaire officiel du ${tessin(cantone)}`,
    vacanzeDel: (calendario) => `vacances et jours fériés du ${calendario}`,
    scegliDate: 'Choisir les dates…',
    scegliDateDescrizione: 'définir le début et la fin à la main',
    nuovoAnno: 'Nouvelle année scolaire',
    formato: 'Format AAAA-MM-JJ',
    dataVera: 'Il faut une vraie date, écrite AAAA-MM-JJ',
    inizioAnno: 'Début de l’année',
    fineAnno: 'Fin de l’année',
    importaSi: 'Oui, je choisis lequel',
    importaSiDescrizione: 'dès que l’année est créée, la fenêtre d’importation s’ouvre',
    importaNo: 'Non, je pars de zéro',
    importaNoDescrizione:
      'tu peux toujours le faire plus tard, depuis Fichier › Importer d’un autre registre',
    importaDomanda: 'Importer classes, cours et paramètres d’un autre registre ?',
    nonSalvato: (nome) => `L’année « ${nome} » n’a pas encore été enregistrée.`,
    nonSalvatoDettaglio:
      'C’est une nouvelle année, et elle se trouve dans un dossier provisoire du programme. ' +
      'Enregistre-la sous un nom pour choisir son emplacement, ou jette-la.',
    salvaConNome: 'Enregistrer sous…',
    buttaAnno: 'Jeter l’année',
    nessunAnnoDaSalvare: 'Il n’y a aucune année ouverte à enregistrer.',
    salvaAnnoConNome: (nome) => `Enregistrer l’année ${nome} sous`,
    salvatoIn: (percorso) => `Année enregistrée dans ${percorso}`,
  },
  en: {
    occupato: (anno, chi) => `The year “${anno}” is already open on ${chi}.`,
    occupatoDettaglio: (quando) =>
      `${quando ? `Opened on ${quando}. ` : ''}If you open it here too, whoever saves last ` +
      'overwrites the other’s work. It may also be a register that wasn’t closed properly: ' +
      'in that case, opening it is the right thing to do.',
    apriLoStesso: 'Open anyway',
    controllo: 'Checking the year’s files…',
    leggo: 'Reading the year’s document…',
    preparo: 'Getting the register ready…',
    finestre: 'Getting the windows ready…',
    apro: 'Opening the register…',
    migratoUno: (corrente) =>
      `Regiclass: the data is now in the folder “${corrente}”, one per school year.`,
    migratiMolti: (anni, corrente) =>
      `Regiclass: the data has been split into ${anni} folders, one per school year. ` +
      `In use: “${corrente}”.`,
    impacchettatoUno: (documento) =>
      `Regiclass: the year’s data is now in the document “${documento}”. ` +
      'The old “dati” folder is in the recycle bin.',
    impacchettatiMolti: (anni, estensione) =>
      `Regiclass: ${anni} years are now as many “${estensione}” documents. ` +
      'The old “dati” folders are in the recycle bin.',
    riordinati: (n) =>
      `Regiclass: ${plurale(n, 'document', 'documents')} tidied up under “archivio/” and ` +
      '“esportazioni/”, by class, course and document.',
    inglobati: (n, documento) =>
      `Regiclass: ${plurale(n, 'document', 'documents')} of the year are now inside ` +
      `“${documento}”. The old folders are in the recycle bin.`,
    traslocoFallito:
      'Regiclass: I couldn’t tidy up all the filed documents. ' +
      'Close the programs keeping the files open and reopen the register.',
    posta: (testo) => `Regiclass — email: ${testo}`,
    azzera: 'Reset',
    azzeraDomanda: 'Reset the register’s email?',
    azzeraDettaglio:
      'Removes the password and the token from the keychain, the tokens in memory and all the ' +
      'registroDocenti.posta.* settings (address, tenant, application ID, direct ' +
      'sending). The connection will have to be set up from scratch.',
    senzaCartella: 'Regiclass: no working folder open.',
    calendarioUfficiale: (cantone) => `official ${cantone} school calendar`,
    vacanzeDel: (calendario) => `holidays and public holidays from the ${calendario}`,
    scegliDate: 'Choose the dates…',
    scegliDateDescrizione: 'set start and end by hand',
    nuovoAnno: 'New school year',
    formato: 'Format YYYY-MM-DD',
    dataVera: 'A real date is needed, written YYYY-MM-DD',
    inizioAnno: 'Start of the year',
    fineAnno: 'End of the year',
    importaSi: 'Yes, I’ll choose which one',
    importaSiDescrizione: 'as soon as the year is created, the import window opens',
    importaNo: 'No, I’ll start from scratch',
    importaNoDescrizione: 'you can always do it later, from File › Import from another register',
    importaDomanda: 'Import classes, courses and settings from another register?',
    nonSalvato: (nome) => `The year “${nome}” hasn’t been saved yet.`,
    nonSalvatoDettaglio:
      'It’s a new year, and it sits in a temporary folder of the program. ' +
      'Save it under a name to choose where it goes, or throw it away.',
    salvaConNome: 'Save as…',
    buttaAnno: 'Throw the year away',
    nessunAnnoDaSalvare: 'There’s no open year to save.',
    salvaAnnoConNome: (nome) => `Save the year ${nome} as`,
    salvatoIn: (percorso) => `Year saved in ${percorso}`,
  },
})

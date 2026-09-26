// I testi della sezione dei modelli linguistici (`languageModels.ts`).
// I nomi di modelli, depositi e file non si traducono.

import { catalogo, minuscolo, numero } from '../../i18n/index.js'

const it = {
  elencoNonLetto: 'L’elenco dei modelli non si è letto.',
  fileNonLetti: 'L’elenco dei file non si è letto.',
  togliere: (nome: string) => `Togliere «${nome}»?`,
  togliereTesto:
    'Il file viene cancellato dal disco. Per riaverlo bisogna scaricarlo di nuovo, e sono ' +
    'di solito qualche gigabyte.',
  pronto: (nome: string) => `«${nome}» è pronto.`,

  // Chi risponde.
  modelloPer: (uso: string) => `Modello per ${minuscolo(uso)}`,
  nessuno: '— nessuno —',
  statoPronto: 'pronto',
  mancaQualcosa: 'manca qualcosa',
  spento: 'spento',
  chiRisponde: 'Chi risponde',
  chiRispondeAiuto:
    'Due mestieri diversi: conversare vuole un modello che sappia chiamare gli strumenti, ' +
    'leggere una scansione vuole un modello che sappia guardare.',
  assistente: 'Assistente',
  assistenteAiuto: 'Risponde alle domande sul registro leggendo i dati veri.',
  lettura: 'Lettura delle scansioni',
  letturaAiuto:
    'Legge i nomi sulle pagine che testo non ne hanno. Vuole anche il suo proiettore.',

  // I file sul computer.
  scesoAMeta: 'sceso a metà',
  riprendibile:
    'Lo scarico non è arrivato in fondo. «Riprendi» riparte da qui e non da capo; '
    + 'buttandolo si libera lo spazio.',
  senzaSorgente:
    'Lo scarico non è arrivato in fondo, e non si sa da quale deposito veniva: '
    + 'si ritrova nel catalogo qui sotto e si riscarica da lì, oppure si butta.',
  riprendi: 'Riprendi',
  riparte: (deposito: string) => `Riparte da dov’era: ${deposito}`,
  butta: 'Butta',
  proiettore: 'proiettore',
  usaloPerScansioni: 'Usalo per le scansioni',
  usaloPerScansioniAiuto: 'Diventa il proiettore del modello che legge le scansioni',
  allAssistente: 'All’assistente',
  alleScansioni: 'Alle scansioni',
  togli: (nome: string) => `Togli ${nome}`,
  sulComputer: 'Sul computer',
  quantiFile: (quanti: number) => quanti === 1 ? 'Un file' : `${quanti} file`,
  ricarica: 'Ricarica',
  stannoIn: (cartella: string) => `Stanno in ${cartella}`,
  nessunModello: 'Nessun modello, per ora',
  nessunModelloTesto:
    'Se ne scarica uno qui sotto — per cominciare va benissimo il primo dei ' +
    'consigliati — oppure ci si trascina dentro un file .gguf che si ha già.',
  trascinaQui: 'Trascina qui un file .gguf che hai già, oppure:',
  caricaFile: 'Carica un file…',
  fileIlleggibile: 'Quel file non si è potuto leggere: usa «Carica un file…».',

  // Lo scarico in corso.
  staScendendo: 'Sta scendendo',
  ferma: 'Ferma',
  fermaAiuto: 'Ferma questo: la coda passa al successivo',
  diTotale: (sceso: string, totale: string) => `${sceso} di ${totale}`,
  siStaCollegando: 'Si sta collegando…',
  inCoda: (quanti: number) => `In coda (${quanti})`,
  togliDallaCoda: (file: string) => `Togli ${file} dalla coda`,

  // I consigliati e i depositi.
  perAssistente: 'per l’assistente',
  perScansioni: 'per le scansioni',
  mettiInCoda: 'Metti in coda',
  inFila: 'In fila',
  nessunFileUsabile: 'Quel deposito non pubblica un file che si possa usare.',
  scaricaProiettore: 'Dopo questo scarica anche il proiettore, qui sotto.',
  vediFile: 'Vedi i file',
  nessunGguf: (deposito: string) => `«${deposito}» non pubblica nessun file .gguf.`,
  tagli: 'Un modello si pubblica in più tagli: più grande pesa di più e risponde meglio.',
  consigliato: 'consigliato',
  consigliati: 'Consigliati',
  consigliatiAiuto:
    'Quattro, e non quaranta: due che conversano e due che guardano, dal più capace al ' +
    'più leggero.',
  leggendoCatalogo: 'Sto leggendo il catalogo…',

  // La ricerca.
  cercaSegnaposto: 'Cerca fra i modelli pubblici: «qwen», «vision», «7b»',
  cercaEtichetta: 'Cerca un modello su Hugging Face',
  cercaTitolo: 'Cerca su Hugging Face',
  cercaSottotitolo:
    'Esce di qui soltanto quel che si scrive in questa casella: la ricerca non sa niente ' +
    'del registro, e quel che scarica entra — non esce.',
  scarichi: (quanti: number) => `${numero(quanti)} scarichi`,
  chiedePermesso: 'chiede il permesso',
  condizioni: 'Questo deposito chiede di accettare delle condizioni: da qui non si scarica',

  // Il vuoto.
  elencoNonLettoTitolo: 'L’elenco dei modelli non si è letto',
  staGuardando: 'Sto guardando che cosa c’è…',
}

export const testi = catalogo(it, {
  de: {
    elencoNonLetto: 'Die Liste der Modelle liess sich nicht lesen.',
    fileNonLetti: 'Die Liste der Dateien liess sich nicht lesen.',
    togliere: (nome) => `«${nome}» entfernen?`,
    togliereTesto:
      'Die Datei wird von der Festplatte gelöscht. Um sie wiederzuhaben, muss man sie neu ' +
      'herunterladen, und das sind meist einige Gigabyte.',
    pronto: (nome) => `«${nome}» ist bereit.`,
    modelloPer: (uso) => `Modell für «${uso}»`,
    nessuno: '— keines —',
    statoPronto: 'bereit',
    mancaQualcosa: 'etwas fehlt',
    spento: 'aus',
    chiRisponde: 'Wer antwortet',
    chiRispondeAiuto:
      'Zwei verschiedene Aufgaben: Zum Gespräch braucht es ein Modell, das Werkzeuge aufrufen ' +
      'kann, zum Lesen eines Scans ein Modell, das sehen kann.',
    assistente: 'Assistent',
    assistenteAiuto: 'Beantwortet Fragen zum Klassenbuch anhand der echten Daten.',
    lettura: 'Lesen der Scans',
    letturaAiuto:
      'Liest die Namen auf Seiten, die keinen Text enthalten. Braucht auch seinen Projektor.',
    scesoAMeta: 'halb heruntergeladen',
    riprendibile:
      'Der Download ist nicht zu Ende gekommen. «Fortsetzen» macht hier weiter und nicht von '
      + 'vorn; wirft man ihn weg, wird der Platz frei.',
    senzaSorgente:
      'Der Download ist nicht zu Ende gekommen, und man weiss nicht, aus welchem Repository er '
      + 'stammte: Man findet das Modell im Katalog weiter unten und lädt es dort neu herunter, '
      + 'oder man wirft den Download weg.',
    riprendi: 'Fortsetzen',
    riparte: (deposito) => `Macht dort weiter, wo er war: ${deposito}`,
    butta: 'Wegwerfen',
    proiettore: 'Projektor',
    usaloPerScansioni: 'Für die Scans verwenden',
    usaloPerScansioniAiuto: 'Wird zum Projektor des Modells, das die Scans liest',
    allAssistente: 'Dem Assistenten',
    alleScansioni: 'Den Scans',
    togli: (nome) => `${nome} entfernen`,
    sulComputer: 'Auf dem Computer',
    quantiFile: (quanti) => quanti === 1 ? 'Eine Datei' : `${quanti} Dateien`,
    ricarica: 'Neu laden',
    stannoIn: (cartella) => `Sie liegen in ${cartella}`,
    nessunModello: 'Noch kein Modell',
    nessunModelloTesto:
      'Man lädt eines weiter unten herunter — für den Anfang passt das erste der empfohlenen ' +
      'bestens — oder zieht eine .gguf-Datei hinein, die man schon hat.',
    trascinaQui: 'Zieh eine .gguf-Datei hierher, die du schon hast, oder:',
    caricaFile: 'Datei laden…',
    fileIlleggibile: 'Diese Datei liess sich nicht lesen: Verwende «Datei laden…».',
    staScendendo: 'Wird heruntergeladen',
    ferma: 'Anhalten',
    fermaAiuto: 'Hält diesen an: Die Warteschlange geht zum nächsten',
    diTotale: (sceso, totale) => `${sceso} von ${totale}`,
    siStaCollegando: 'Verbindung wird aufgebaut…',
    inCoda: (quanti) => `In der Warteschlange (${quanti})`,
    togliDallaCoda: (file) => `${file} aus der Warteschlange entfernen`,
    perAssistente: 'für den Assistenten',
    perScansioni: 'für die Scans',
    mettiInCoda: 'Einreihen',
    inFila: 'Eingereiht',
    nessunFileUsabile: 'Dieses Repository veröffentlicht keine brauchbare Datei.',
    scaricaProiettore: 'Lade danach auch den Projektor herunter, weiter unten.',
    vediFile: 'Dateien ansehen',
    nessunGguf: (deposito) => `«${deposito}» veröffentlicht keine .gguf-Datei.`,
    tagli:
      'Ein Modell erscheint in mehreren Grössen: Grösser wiegt mehr und antwortet besser.',
    consigliato: 'empfohlen',
    consigliati: 'Empfohlen',
    consigliatiAiuto:
      'Vier, nicht vierzig: zwei, die sich unterhalten, und zwei, die sehen, vom fähigsten ' +
      'zum leichtesten.',
    leggendoCatalogo: 'Der Katalog wird gelesen…',
    cercaSegnaposto: 'In den öffentlichen Modellen suchen: «qwen», «vision», «7b»',
    cercaEtichetta: 'Ein Modell auf Hugging Face suchen',
    cercaTitolo: 'Auf Hugging Face suchen',
    cercaSottotitolo:
      'Hinaus geht nur, was man in dieses Feld schreibt: Die Suche weiss nichts vom ' +
      'Klassenbuch, und was sie herunterlädt, kommt herein — nicht hinaus.',
    scarichi: (quanti) => `${numero(quanti)} Downloads`,
    chiedePermesso: 'verlangt eine Freigabe',
    condizioni:
      'Dieses Repository verlangt, Bedingungen zu akzeptieren: Von hier aus lässt es sich ' +
      'nicht herunterladen',
    elencoNonLettoTitolo: 'Die Liste der Modelle liess sich nicht lesen',
    staGuardando: 'Ich schaue nach, was da ist…',
  },
  fr: {
    elencoNonLetto: 'La liste des modèles n’a pas pu être lue.',
    fileNonLetti: 'La liste des fichiers n’a pas pu être lue.',
    togliere: (nome) => `Retirer « ${nome} » ?`,
    togliereTesto:
      'Le fichier est effacé du disque. Pour le récupérer, il faut le télécharger à nouveau, ' +
      'et ce sont en général quelques gigaoctets.',
    pronto: (nome) => `« ${nome} » est prêt.`,
    modelloPer: (uso) => `Modèle pour ${minuscolo(uso)}`,
    nessuno: '— aucun —',
    statoPronto: 'prêt',
    mancaQualcosa: 'il manque quelque chose',
    spento: 'désactivé',
    chiRisponde: 'Qui répond',
    chiRispondeAiuto:
      'Deux métiers différents : converser demande un modèle qui sache appeler des outils, ' +
      'lire un scan un modèle qui sache regarder.',
    assistente: 'Assistant',
    assistenteAiuto: 'Répond aux questions sur le registre en lisant les vraies données.',
    lettura: 'Lecture des scans',
    letturaAiuto:
      'Lit les noms sur les pages qui n’ont pas de texte. Il lui faut aussi son projecteur.',
    scesoAMeta: 'téléchargé à moitié',
    riprendibile:
      'Le téléchargement n’est pas allé jusqu’au bout. « Reprendre » repart d’ici et non du '
      + 'début ; en le jetant, on libère la place.',
    senzaSorgente:
      'Le téléchargement n’est pas allé jusqu’au bout, et on ne sait pas de quel dépôt il '
      + 'venait : on le retrouve dans le catalogue ci-dessous et on le télécharge de nouveau '
      + 'depuis là, ou bien on le jette.',
    riprendi: 'Reprendre',
    riparte: (deposito) => `Repart d’où il en était : ${deposito}`,
    butta: 'Jeter',
    proiettore: 'projecteur',
    usaloPerScansioni: 'L’utiliser pour les scans',
    usaloPerScansioniAiuto: 'Devient le projecteur du modèle qui lit les scans',
    allAssistente: 'À l’assistant',
    alleScansioni: 'Aux scans',
    togli: (nome) => `Retirer ${nome}`,
    sulComputer: 'Sur l’ordinateur',
    quantiFile: (quanti) => quanti === 1 ? 'Un fichier' : `${quanti} fichiers`,
    ricarica: 'Recharger',
    stannoIn: (cartella) => `Ils se trouvent dans ${cartella}`,
    nessunModello: 'Aucun modèle, pour l’instant',
    nessunModelloTesto:
      'On en télécharge un ci-dessous — pour commencer, le premier des recommandés convient ' +
      'très bien — ou on y glisse un fichier .gguf qu’on a déjà.',
    trascinaQui: 'Glisse ici un fichier .gguf que tu as déjà, ou bien :',
    caricaFile: 'Charger un fichier…',
    fileIlleggibile: 'Ce fichier n’a pas pu être lu : utilise « Charger un fichier… ».',
    staScendendo: 'Téléchargement en cours',
    ferma: 'Arrêter',
    fermaAiuto: 'Arrête celui-ci : la file passe au suivant',
    diTotale: (sceso, totale) => `${sceso} sur ${totale}`,
    siStaCollegando: 'Connexion en cours…',
    inCoda: (quanti) => `En file d’attente (${quanti})`,
    togliDallaCoda: (file) => `Retirer ${file} de la file`,
    perAssistente: 'pour l’assistant',
    perScansioni: 'pour les scans',
    mettiInCoda: 'Mettre en file',
    inFila: 'En file',
    nessunFileUsabile: 'Ce dépôt ne publie aucun fichier utilisable.',
    scaricaProiettore: 'Après celui-ci, télécharge aussi le projecteur, ci-dessous.',
    vediFile: 'Voir les fichiers',
    nessunGguf: (deposito) => `« ${deposito} » ne publie aucun fichier .gguf.`,
    tagli:
      'Un modèle se publie en plusieurs tailles : plus il est grand, plus il pèse et mieux il ' +
      'répond.',
    consigliato: 'recommandé',
    consigliati: 'Recommandés',
    consigliatiAiuto:
      'Quatre, et non quarante : deux qui conversent et deux qui regardent, du plus capable au ' +
      'plus léger.',
    leggendoCatalogo: 'Lecture du catalogue…',
    cercaSegnaposto: 'Chercher parmi les modèles publics : « qwen », « vision », « 7b »',
    cercaEtichetta: 'Chercher un modèle sur Hugging Face',
    cercaTitolo: 'Chercher sur Hugging Face',
    cercaSottotitolo:
      'Ne sort d’ici que ce qu’on écrit dans ce champ : la recherche ne sait rien du ' +
      'registre, et ce qu’elle télécharge entre — ne sort pas.',
    scarichi: (quanti) => `${numero(quanti)} téléchargements`,
    chiedePermesso: 'demande une autorisation',
    condizioni:
      'Ce dépôt demande d’accepter des conditions : on ne peut pas le télécharger d’ici',
    elencoNonLettoTitolo: 'La liste des modèles n’a pas pu être lue',
    staGuardando: 'Je regarde ce qu’il y a…',
  },
  en: {
    elencoNonLetto: 'The list of models could not be read.',
    fileNonLetti: 'The list of files could not be read.',
    togliere: (nome) => `Remove “${nome}”?`,
    togliereTesto:
      'The file is deleted from the disk. Getting it back means downloading it again, and that ' +
      'is usually a few gigabytes.',
    pronto: (nome) => `“${nome}” is ready.`,
    modelloPer: (uso) => `Model for ${minuscolo(uso)}`,
    nessuno: '— none —',
    statoPronto: 'ready',
    mancaQualcosa: 'something missing',
    spento: 'off',
    chiRisponde: 'Who answers',
    chiRispondeAiuto:
      'Two different jobs: conversing needs a model that can call tools, reading a scan needs ' +
      'a model that can see.',
    assistente: 'Assistant',
    assistenteAiuto: 'Answers questions about the register by reading the real data.',
    lettura: 'Scan reading',
    letturaAiuto:
      'Reads the names on pages that have no text in them. It also needs its projector.',
    scesoAMeta: 'half downloaded',
    riprendibile:
      'The download did not finish. “Resume” carries on from here, not from the start; '
      + 'throwing it away frees the space.',
    senzaSorgente:
      'The download did not finish, and it is not known which repository it came from: '
      + 'find it in the catalogue below and download it again from there, or throw it away.',
    riprendi: 'Resume',
    riparte: (deposito) => `Carries on from where it was: ${deposito}`,
    butta: 'Throw away',
    proiettore: 'projector',
    usaloPerScansioni: 'Use it for scans',
    usaloPerScansioniAiuto: 'Becomes the projector of the model that reads scans',
    allAssistente: 'To the assistant',
    alleScansioni: 'To scans',
    togli: (nome) => `Remove ${nome}`,
    sulComputer: 'On this computer',
    quantiFile: (quanti) => quanti === 1 ? 'One file' : `${quanti} files`,
    ricarica: 'Reload',
    stannoIn: (cartella) => `They are in ${cartella}`,
    nessunModello: 'No models yet',
    nessunModelloTesto:
      'Download one below — to start with, the first recommended one is just fine — or drag ' +
      'in a .gguf file you already have.',
    trascinaQui: 'Drag a .gguf file you already have here, or:',
    caricaFile: 'Load a file…',
    fileIlleggibile: 'That file could not be read: use “Load a file…”.',
    staScendendo: 'Downloading',
    ferma: 'Stop',
    fermaAiuto: 'Stops this one: the queue moves on to the next',
    diTotale: (sceso, totale) => `${sceso} of ${totale}`,
    siStaCollegando: 'Connecting…',
    inCoda: (quanti) => `Queued (${quanti})`,
    togliDallaCoda: (file) => `Remove ${file} from the queue`,
    perAssistente: 'for the assistant',
    perScansioni: 'for scans',
    mettiInCoda: 'Add to queue',
    inFila: 'Queued',
    nessunFileUsabile: 'That repository does not publish a file that can be used.',
    scaricaProiettore: 'After this one, download the projector too, below.',
    vediFile: 'See the files',
    nessunGguf: (deposito) => `“${deposito}” does not publish any .gguf file.`,
    tagli: 'A model is published in several sizes: bigger weighs more and answers better.',
    consigliato: 'recommended',
    consigliati: 'Recommended',
    consigliatiAiuto:
      'Four, not forty: two that converse and two that see, from the most capable to the ' +
      'lightest.',
    leggendoCatalogo: 'Reading the catalogue…',
    cercaSegnaposto: 'Search the public models: “qwen”, “vision”, “7b”',
    cercaEtichetta: 'Search for a model on Hugging Face',
    cercaTitolo: 'Search Hugging Face',
    cercaSottotitolo:
      'Only what you type in this box leaves this computer: the search knows nothing about ' +
      'the register, and what it downloads comes in — it does not go out.',
    scarichi: (quanti) => `${numero(quanti)} downloads`,
    chiedePermesso: 'asks for permission',
    condizioni:
      'This repository asks you to accept some conditions: it cannot be downloaded from here',
    elencoNonLettoTitolo: 'The list of models could not be read',
    staGuardando: 'Looking at what is there…',
  },
})

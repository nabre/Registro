// I testi dei modelli locali (`llm.ts`, `nodeLlama.ts`, `llamaCpp.ts`). Alcuni
// li legge chi insegna, altri il modello stesso (domanda di chiusura, risultato
// tolto, attrezzi esauriti): questi seguono la lingua della risposta, vedi
// `api/transports/assistant.testi.ts`.

import { catalogo } from '../i18n/index.js'

const it = {
  // ------------------------------------------------------------ llm.ts
  /** Come si chiama un uso, in testa al motivo per cui non è pronto. */
  nomi: {
    ocr: 'La lettura delle scansioni',
    assistente: 'L’assistente',
  },
  /** Dove si accende un uso, per chi legge il motivo e deve rimediare. */
  doveSiAccende: {
    ocr: 'nelle impostazioni, sotto «Modelli linguistici»',
    assistente: 'nelle impostazioni, sotto «Modelli linguistici»',
  },
  senzaModello: (nome: string) =>
    `${nome} non ha un modello: se ne scarica uno dalla sezione «Modelli ` +
    'linguistici» delle impostazioni, oppure ci si trascina dentro un file .gguf che si ' +
    'ha già.',
  spento: (nome: string, dove: string) => `${nome} è spenta: si accende ${dove}.`,
  modelloSparito: (modello: string) =>
    `Il modello «${modello}» non è più nella cartella dei modelli: lo si ` +
    'riscarica dalla sezione «Modelli linguistici» delle impostazioni, o se ne sceglie ' +
    'un altro.',
  nonGenera: (motore: string) => `${motore} non risponde a domande secche.`,
  nonConversa: (motore: string) => `${motore} non sa conversare.`,
  nonRisposto: (motore: string) => `${motore} non ha risposto.`,

  // ------------------------------------------------------------ nodeLlama.ts
  libreria:
    'La libreria dei modelli (node-llama-cpp) non si è caricata: l’installazione del ' +
    'registro è incompleta.',

  // ------------------------------------------------------------ llamaCpp.ts
  /** La domanda finale senza attrezzi: la legge il modello. */
  chiusura:
    'Basta attrezzi. Rispondi adesso, in italiano, con quel che hai già letto qui sopra, ' +
    'e di’ apertamente che cosa non sei riuscito a sapere.',
  /** Gli esempi di un campo, in coda alla sua descrizione nel catalogo degli attrezzi. */
  esempi: (esempi: string) => `(es. ${esempi})`,
  piuPiccolo:
    'si rimedia scegliendone uno più piccolo nella sezione «Modelli linguistici» delle ' +
    'impostazioni.',
  inCoda: (secondi: number) =>
    `La domanda è rimasta in coda per ${secondi} secondi dietro un’altra, e non è stata ` +
    'letta: il modello risponde a una domanda per volta. Si può rifarla appena ' +
    'l’altra risposta è arrivata.',
  nonCaricato: (secondi: number, rimedio: string) =>
    `Il modello non è riuscito nemmeno a caricarsi entro ${secondi} secondi: la domanda ` +
    `non è stata letta. È grosso per questa macchina, o il disco è lento — ${rimedio}`,
  caricamentoLento: (caricamento: number, secondi: number, rimedio: string) =>
    `Il modello ci ha messo ${caricamento} secondi solo a caricarsi, e poi non ha finito ` +
    `di rispondere entro altri ${secondi}. Per questa macchina è grosso: ${rimedio}`,
  scaduta: (secondi: number) =>
    `Il modello non ha finito di rispondere entro ${secondi} secondi. Può essere che la ` +
    'domanda fosse lunga, oppure che questo modello sia grosso per questa macchina: si ' +
    'rimedia chiedendo meno cose insieme, o scegliendone uno più piccolo nella sezione ' +
    '«Modelli linguistici» delle impostazioni.',
  /** Al modello che chiama un attrezzo oltre il tetto. */
  esauriti:
    'Hai esaurito gli attrezzi per questa domanda. Rispondi adesso con quel che hai ' +
    'letto, e di’ apertamente che cosa non sei riuscito a sapere.',
  senzaEsecutore: 'Errore: qui non c’è niente che possa eseguire gli attrezzi.',
  errore: (messaggio: string) => `Errore: ${messaggio}`,
  memoria: (pavimento: number) =>
    'Non c’è abbastanza memoria per far ragionare questo modello: gli servono ' +
    `${pavimento} token di contesto e la macchina non li concede, né sulla scheda video ` +
    'né nella memoria di sistema. Si rimedia scegliendo un modello più piccolo nella ' +
    'sezione «Modelli linguistici» delle impostazioni, oppure chiudendo i programmi che ' +
    'stanno occupando la ' +
    'memoria.',
  /** Al posto di un risultato tolto per far posto: lo legge il modello. */
  tolto: (nome: string) =>
    `[Il risultato di «${nome}» è stato tolto da qui per far posto: il contesto era pieno. ` +
    'Se ti serve ancora, richiama quell’attrezzo.]',
  nienteDaChiedere:
    'Non c’è niente da chiedere: l’ultima battuta della conversazione non è di chi scrive.',
}

export const testi = catalogo(it, {
  de: {
    nomi: {
      ocr: 'Das Lesen der Scans',
      assistente: 'Der Assistent',
    },
    doveSiAccende: {
      ocr: 'in den Einstellungen unter «Sprachmodelle»',
      assistente: 'in den Einstellungen unter «Sprachmodelle»',
    },
    senzaModello: (nome) =>
      `${nome} hat kein Modell: Lade eines im Bereich «Sprachmodelle» der Einstellungen ` +
      'herunter oder zieh eine .gguf-Datei hinein, die du schon hast.',
    spento: (nome, dove) => `${nome} ist ausgeschaltet. Einschalten: ${dove}.`,
    modelloSparito: (modello) =>
      `Das Modell «${modello}» ist nicht mehr im Modellordner: Lade es im Bereich ` +
      '«Sprachmodelle» der Einstellungen erneut herunter oder wähle ein anderes.',
    nonGenera: (motore) => `${motore} beantwortet keine einzelnen Fragen.`,
    nonConversa: (motore) => `${motore} kann kein Gespräch führen.`,
    nonRisposto: (motore) => `${motore} hat nicht geantwortet.`,
    libreria:
      'Die Modellbibliothek (node-llama-cpp) wurde nicht geladen: Die Installation des ' +
      'Klassenbuchs ist unvollständig.',
    chiusura:
      'Schluss mit den Werkzeugen. Antworte jetzt, auf Deutsch, mit dem, was du oben schon ' +
      'gelesen hast, und sag offen, was du nicht herausfinden konntest.',
    esempi: (esempi) => `(z. B. ${esempi})`,
    piuPiccolo:
      'Abhilfe schafft ein kleineres Modell aus dem Bereich «Sprachmodelle» der Einstellungen.',
    inCoda: (secondi) =>
      `Die Frage stand ${secondi} Sekunden lang hinter einer anderen in der Warteschlange und ` +
      'wurde nicht gelesen: Das Modell beantwortet eine Frage nach der anderen. Du kannst sie ' +
      'erneut stellen, sobald die andere Antwort da ist.',
    nonCaricato: (secondi, rimedio) =>
      `Das Modell konnte sich nicht einmal innerhalb von ${secondi} Sekunden laden: Die Frage ` +
      'wurde nicht gelesen. Es ist zu gross für diesen Computer, oder die Festplatte ist ' +
      `langsam — ${rimedio}`,
    caricamentoLento: (caricamento, secondi, rimedio) =>
      `Das Modell brauchte ${caricamento} Sekunden allein zum Laden und hat dann nicht ` +
      `innerhalb von weiteren ${secondi} fertig geantwortet. Für diesen Computer ist es zu ` +
      `gross: ${rimedio}`,
    scaduta: (secondi) =>
      `Das Modell hat nicht innerhalb von ${secondi} Sekunden fertig geantwortet. Vielleicht ` +
      'war die Frage lang, oder dieses Modell ist für diesen Computer zu gross: Abhilfe ' +
      'schafft, weniger Dinge auf einmal zu fragen oder ein kleineres Modell im Bereich ' +
      '«Sprachmodelle» der Einstellungen zu wählen.',
    esauriti:
      'Du hast die Werkzeuge für diese Frage aufgebraucht. Antworte jetzt mit dem, was du ' +
      'gelesen hast, und sag offen, was du nicht herausfinden konntest.',
    senzaEsecutore: 'Fehler: Hier gibt es nichts, was die Werkzeuge ausführen könnte.',
    errore: (messaggio) => `Fehler: ${messaggio}`,
    memoria: (pavimento) =>
      'Es gibt nicht genug Speicher, um dieses Modell arbeiten zu lassen: Es braucht ' +
      `${pavimento} Token Kontext, und der Computer stellt sie nicht bereit, weder auf der ` +
      'Grafikkarte noch im Arbeitsspeicher. Abhilfe schafft ein kleineres Modell im Bereich ' +
      '«Sprachmodelle» der Einstellungen, oder das Schliessen der Programme, die den ' +
      'Speicher belegen.',
    tolto: (nome) =>
      `[Das Ergebnis von «${nome}» wurde hier entfernt, um Platz zu schaffen: Der Kontext war ` +
      'voll. Wenn du es noch brauchst, ruf dieses Werkzeug erneut auf.]',
    nienteDaChiedere:
      'Es gibt nichts zu fragen: Der letzte Beitrag im Gespräch stammt nicht von der Person, ' +
      'die schreibt.',
  },
  fr: {
    nomi: {
      ocr: 'La lecture des scans',
      assistente: 'L’assistant',
    },
    doveSiAccende: {
      ocr: 'dans les paramètres, sous « Modèles de langage »',
      assistente: 'dans les paramètres, sous « Modèles de langage »',
    },
    senzaModello: (nome) =>
      `${nome} n’a pas de modèle : tu peux en télécharger un depuis la section « Modèles de ` +
      'langage » des paramètres, ou y glisser un fichier .gguf que tu as déjà.',
    spento: (nome, dove) => `${nome} est à l’arrêt : tu peux l’activer ${dove}.`,
    modelloSparito: (modello) =>
      `Le modèle « ${modello} » n’est plus dans le dossier des modèles : tu peux le ` +
      'télécharger à nouveau depuis la section « Modèles de langage » des paramètres, ou en ' +
      'choisir un autre.',
    nonGenera: (motore) => `${motore} ne répond pas aux questions simples.`,
    nonConversa: (motore) => `${motore} ne sait pas converser.`,
    nonRisposto: (motore) => `${motore} n’a pas répondu.`,
    libreria:
      'La bibliothèque des modèles (node-llama-cpp) ne s’est pas chargée : l’installation du ' +
      'registre est incomplète.',
    chiusura:
      'Assez d’outils. Réponds maintenant, en français, avec ce que tu as déjà lu ci-dessus, ' +
      'et dis ouvertement ce que tu n’as pas réussi à savoir.',
    esempi: (esempi) => `(p. ex. ${esempi})`,
    piuPiccolo:
      'on y remédie en en choisissant un plus petit dans la section « Modèles de langage » ' +
      'des paramètres.',
    inCoda: (secondi) =>
      `La question est restée ${secondi} secondes en file d’attente derrière une autre, et ` +
      'n’a pas été lue : le modèle répond à une question à la fois. Tu peux la reposer dès ' +
      'que l’autre réponse est arrivée.',
    nonCaricato: (secondi, rimedio) =>
      `Le modèle n’a même pas réussi à se charger en ${secondi} secondes : la question n’a ` +
      `pas été lue. Il est trop gros pour cette machine, ou le disque est lent — ${rimedio}`,
    caricamentoLento: (caricamento, secondi, rimedio) =>
      `Le modèle a mis ${caricamento} secondes rien que pour se charger, puis n’a pas fini ` +
      `de répondre dans les ${secondi} suivantes. Pour cette machine, il est trop gros : ` +
      `${rimedio}`,
    scaduta: (secondi) =>
      `Le modèle n’a pas fini de répondre en ${secondi} secondes. Peut-être que la question ` +
      'était longue, ou que ce modèle est trop gros pour cette machine : on y remédie en ' +
      'demandant moins de choses à la fois, ou en en choisissant un plus petit dans la ' +
      'section « Modèles de langage » des paramètres.',
    esauriti:
      'Tu as épuisé les outils pour cette question. Réponds maintenant avec ce que tu as lu, ' +
      'et dis ouvertement ce que tu n’as pas réussi à savoir.',
    senzaEsecutore: 'Erreur : il n’y a rien ici qui puisse exécuter les outils.',
    errore: (messaggio) => `Erreur : ${messaggio}`,
    memoria: (pavimento) =>
      'Il n’y a pas assez de mémoire pour faire raisonner ce modèle : il lui faut ' +
      `${pavimento} jetons de contexte et la machine ne les accorde pas, ni sur la carte ` +
      'graphique ni dans la mémoire système. On y remédie en choisissant un modèle plus ' +
      'petit dans la section « Modèles de langage » des paramètres, ou en fermant les ' +
      'programmes qui occupent la mémoire.',
    tolto: (nome) =>
      `[Le résultat de « ${nome} » a été retiré d’ici pour faire de la place : le contexte ` +
      'était plein. Si tu en as encore besoin, rappelle cet outil.]',
    nienteDaChiedere:
      'Il n’y a rien à demander : la dernière réplique de la conversation n’est pas de la ' +
      'personne qui écrit.',
  },
  en: {
    nomi: {
      ocr: 'Reading scans',
      assistente: 'The assistant',
    },
    doveSiAccende: {
      ocr: 'in the settings, under “Language models”',
      assistente: 'in the settings, under “Language models”',
    },
    senzaModello: (nome) =>
      `${nome} has no model: download one from the “Language models” section of the ` +
      'settings, or drag in a .gguf file you already have.',
    spento: (nome, dove) => `${nome} is switched off: switch it on ${dove}.`,
    modelloSparito: (modello) =>
      `The model “${modello}” is no longer in the models folder: download it again from the ` +
      '“Language models” section of the settings, or choose another one.',
    nonGenera: (motore) => `${motore} does not answer single questions.`,
    nonConversa: (motore) => `${motore} cannot hold a conversation.`,
    nonRisposto: (motore) => `${motore} did not answer.`,
    libreria:
      'The model library (node-llama-cpp) did not load: the register’s installation is ' +
      'incomplete.',
    chiusura:
      'No more tools. Answer now, in English, with what you have already read above, and ' +
      'say openly what you could not find out.',
    esempi: (esempi) => `(e.g. ${esempi})`,
    piuPiccolo:
      'the fix is to choose a smaller one in the “Language models” section of the settings.',
    inCoda: (secondi) =>
      `The question waited in the queue for ${secondi} seconds behind another one and was ` +
      'not read: the model answers one question at a time. You can ask it again as soon as ' +
      'the other answer has arrived.',
    nonCaricato: (secondi, rimedio) =>
      `The model could not even load within ${secondi} seconds: the question was not read. ` +
      `It is too big for this computer, or the disk is slow — ${rimedio}`,
    caricamentoLento: (caricamento, secondi, rimedio) =>
      `The model took ${caricamento} seconds just to load, and then did not finish answering ` +
      `within another ${secondi}. It is too big for this computer: ${rimedio}`,
    scaduta: (secondi) =>
      `The model did not finish answering within ${secondi} seconds. The question may have ` +
      'been long, or this model may be too big for this computer: the fix is to ask fewer ' +
      'things at once, or to choose a smaller one in the “Language models” section of the ' +
      'settings.',
    esauriti:
      'You have used up the tools for this question. Answer now with what you have read, ' +
      'and say openly what you could not find out.',
    senzaEsecutore: 'Error: there is nothing here that can run the tools.',
    errore: (messaggio) => `Error: ${messaggio}`,
    memoria: (pavimento) =>
      'There is not enough memory to run this model: it needs ' +
      `${pavimento} tokens of context and the computer cannot provide them, either on the ` +
      'graphics card or in system memory. The fix is to choose a smaller model in the ' +
      '“Language models” section of the settings, or to close the programs that are using ' +
      'the memory.',
    tolto: (nome) =>
      `[The result of “${nome}” was removed from here to make room: the context was full. ` +
      'If you still need it, call that tool again.]',
    nienteDaChiedere:
      'There is nothing to ask: the last turn of the conversation is not from the person ' +
      'writing.',
  },
})

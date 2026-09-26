// I testi della lettura delle scansioni: la richiesta al modello (`ocr.ts`), i
// guasti del programma (`mtmd.ts`) e il suo nome mentre scende (`visionKit.ts`).
// La richiesta segue la lingua del registro e chiede di trascrivere, non tradurre.

import { catalogo } from '../i18n/index.js'

const it = {
  /** Quel che si chiede al modello, per ogni pagina. */
  richiesta: 'Trascrivi il testo di questa pagina, in particolare nomi e cognomi. Solo il testo.',
  programmaNonIndicato: 'Il programma per leggere le scansioni non è indicato.',
  fermata: 'La lettura della scansione è stata fermata.',
  troppaUscita:
    'llama-mtmd-cli ha scritto più di quanto si possa leggere per una pagina: ' +
    'la risposta è stata troncata e non si usa.',
  scaduta: (secondi: number) => `La lettura non è finita entro ${secondi} secondi.`,
  nonRiuscito: (messaggio: string) =>
    `llama-mtmd-cli non è riuscito a leggere la pagina: ${messaggio}`,
  senzaProiettore:
    'Il modello che legge le scansioni ha bisogno anche del suo proiettore — il file ' +
    '«mmproj» —, che si scarica insieme a lui dalla sezione «Modelli linguistici» delle ' +
    'impostazioni.',
  senzaProgramma: (daDove: string) =>
    'Per leggere le scansioni serve «llama-mtmd-cli», il programma di llama.cpp per i ' +
    `modelli che guardano: si scarica da ${daDove} e si sceglie nelle impostazioni, ` +
    'sotto «Modelli linguistici».',
  nienteDaGuardare: 'Non c’è niente da guardare.',
  /** Come si chiama il programma mentre scende: «Non riesco a scaricare …». */
  programma: 'il programma che legge le scansioni',
}

export const testi = catalogo(it, {
  de: {
    richiesta: 'Transkribiere den Text dieser Seite, besonders Vor- und Nachnamen. Nur den Text.',
    programmaNonIndicato: 'Das Programm zum Lesen der Scans ist nicht angegeben.',
    fermata: 'Das Lesen des Scans wurde angehalten.',
    troppaUscita:
      'llama-mtmd-cli hat mehr ausgegeben, als sich für eine Seite lesen lässt: ' +
      'Die Antwort wurde abgeschnitten und wird nicht verwendet.',
    scaduta: (secondi) => `Das Lesen war nicht innerhalb von ${secondi} Sekunden fertig.`,
    nonRiuscito: (messaggio) => `llama-mtmd-cli konnte die Seite nicht lesen: ${messaggio}`,
    senzaProiettore:
      'Das Modell, das die Scans liest, braucht auch seinen Projektor — die Datei ' +
      '«mmproj» —, der zusammen mit ihm im Bereich «Sprachmodelle» der Einstellungen ' +
      'heruntergeladen wird.',
    senzaProgramma: (daDove) =>
      'Zum Lesen der Scans braucht es «llama-mtmd-cli», das Programm von llama.cpp für ' +
      `Modelle, die sehen: Lade es von ${daDove} herunter und wähle es in den ` +
      'Einstellungen unter «Sprachmodelle».',
    nienteDaGuardare: 'Es gibt nichts anzuschauen.',
    programma: 'das Programm, das die Scans liest',
  },
  fr: {
    richiesta:
      'Transcris le texte de cette page, en particulier les noms et prénoms. Seulement le texte.',
    programmaNonIndicato: 'Le programme pour lire les scans n’est pas indiqué.',
    fermata: 'La lecture du scan a été arrêtée.',
    troppaUscita:
      'llama-mtmd-cli a écrit plus que ce qu’on peut lire pour une page : ' +
      'la réponse a été tronquée et n’est pas utilisée.',
    scaduta: (secondi) => `La lecture n’a pas fini en ${secondi} secondes.`,
    nonRiuscito: (messaggio) => `llama-mtmd-cli n’a pas réussi à lire la page : ${messaggio}`,
    senzaProiettore:
      'Le modèle qui lit les scans a aussi besoin de son projecteur — le fichier ' +
      '« mmproj » —, qui se télécharge avec lui depuis la section « Modèles de langage » des ' +
      'paramètres.',
    senzaProgramma: (daDove) =>
      'Pour lire les scans, il faut « llama-mtmd-cli », le programme de llama.cpp ' +
      `pour les modèles qui voient : télécharge-le depuis ${daDove} et choisis-le ` +
      'dans les paramètres, sous « Modèles de langage ».',
    nienteDaGuardare: 'Il n’y a rien à regarder.',
    programma: 'le programme qui lit les scans',
  },
  en: {
    richiesta:
      'Transcribe the text of this page, especially first names and surnames. Only the text.',
    programmaNonIndicato: 'The program for reading scans has not been specified.',
    fermata: 'Reading the scan was stopped.',
    troppaUscita:
      'llama-mtmd-cli wrote more than can be read for one page: ' +
      'the answer was cut off and is not used.',
    scaduta: (secondi) => `Reading did not finish within ${secondi} seconds.`,
    nonRiuscito: (messaggio) => `llama-mtmd-cli could not read the page: ${messaggio}`,
    senzaProiettore:
      'The model that reads scans also needs its projector — the “mmproj” file —, which is ' +
      'downloaded together with it from the “Language models” section of the settings.',
    senzaProgramma: (daDove) =>
      'Reading scans needs “llama-mtmd-cli”, the llama.cpp program for models that see: ' +
      `download it from ${daDove} and choose it in the settings, under “Language models”.`,
    nienteDaGuardare: 'There is nothing to look at.',
    programma: 'the program that reads scans',
  },
})

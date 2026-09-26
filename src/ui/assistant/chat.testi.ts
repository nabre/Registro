// I testi della conversazione con l'assistente: il filo (`chat.ts`), le tabelle
// lette (`result.ts`) e il microfono (`voice.ts`). «Ferma» sta qui con la riga
// che lo cita fra virgolette.

import { catalogo } from '../../i18n/index.js'

const it = {
  // ------------------------------------------------------------ il filo
  nonRisposto: 'Non sono riuscito a rispondere con quel che ho letto.',
  fermato: 'Fermato.',
  letto: (nome: string) => `Letto: ${nome}`,
  nonRiuscito: (nome: string, codice: string | undefined) =>
    `Non riuscito: ${nome}${codice ? ` (${codice})` : ''}`,
  esaurito:
    'Ho finito le letture che posso fare per una domanda: la risposta è scritta con ' +
    'quel che ho letto fin qui. Se manca qualcosa, chiedi una cosa più stretta.',
  pensando: 'Sto pensando…',
  leggendo: 'Sto leggendo il registro…',

  // ------------------------------------------------------------ lo scrittoio
  segnaposto: 'Che cosa vuoi sapere del registro?',
  etichettaCampo: 'La domanda per l’assistente',
  ferma: 'Ferma',
  chiedi: 'Chiedi',
  continuoAdAscoltare: (motivo: string) => `${motivo} Continuo ad ascoltarti.`,
  tiAscolto:
    'Ti ascolto: quel che dici compare qui sotto a mano a mano. ' +
    'Premi «Ferma» quando hai finito, Esc per lasciar perdere.',
  staScrivendo: 'Sto scrivendo quel che hai detto…',
  nonLoCambia: 'Legge il registro e ne apre le pagine; non lo cambia.',
  tasti: 'Invio manda, Maiusc+Invio va a capo.',
  comeSiChiede: 'Come si chiede',
  staScrivendoTitolo: 'Sto scrivendo quel che hai detto',
  smettiDiAscoltare: 'Smetti di ascoltare e scrivi quel che ho sentito',
  detta: 'Detta la domanda a voce',

  // ------------------------------------------------------------ gli stati vuoti
  spento: 'L’assistente è spento',
  spentoTesto:
    'Si accende nelle impostazioni del programma, sotto «Assistente». Serve un modello ' +
    'scaricato sulla macchina che sappia chiamare gli strumenti — da 7 miliardi di ' +
    'parametri in su — e lo si sceglie da lì. Niente esce dal computer.',
  apriImpostazioni: 'Apri le impostazioni',
  vuoto: 'Chiedi qualcosa del registro',
  vuotoTesto:
    'Per esempio: «che corsi ho quest’anno?», «quante ore ha perso la 4a in ' +
    'matematica dal 1° settembre?». Sotto ogni risposta stanno le procedure che ' +
    'ha aperto per scriverla: se non ce n’è nessuna, non ha letto niente.',

  // ------------------------------------------------------------ le tabelle lette
  seNeVedono: (mostrate: number, quante: number) => `Se ne vedono ${mostrate} di ${quante}.`,

  // ------------------------------------------------------------ il microfono
  microfonoNegato:
    'Il microfono non è stato concesso: lo si autorizza nelle impostazioni di Windows, sotto ' +
    '«Privacy e sicurezza», «Microfono».',
  nessunMicrofono: 'Non c’è nessun microfono attaccato a questo computer.',
  microfonoOccupato: 'Il microfono è occupato da un altro programma.',
  microfonoChiuso: (dettaglio: string) => `Il microfono non si è aperto: ${dettaglio}`,
}

export const testi = catalogo(it, {
  de: {
    nonRisposto: 'Mit dem, was ich gelesen habe, konnte ich nicht antworten.',
    fermato: 'Angehalten.',
    letto: (nome) => `Gelesen: ${nome}`,
    nonRiuscito: (nome, codice) => `Nicht gelungen: ${nome}${codice ? ` (${codice})` : ''}`,
    esaurito:
      'Ich habe alle Lesevorgänge aufgebraucht, die ich für eine Frage machen kann: Die ' +
      'Antwort ist mit dem geschrieben, was ich bis hier gelesen habe. Wenn etwas fehlt, ' +
      'frag gezielter.',
    pensando: 'Ich denke nach…',
    leggendo: 'Ich lese das Klassenbuch…',
    segnaposto: 'Was willst du über das Klassenbuch wissen?',
    etichettaCampo: 'Die Frage an den Assistenten',
    ferma: 'Stopp',
    chiedi: 'Fragen',
    continuoAdAscoltare: (motivo) => `${motivo} Ich höre weiter zu.`,
    tiAscolto:
      'Ich höre zu: Was du sagst, erscheint laufend hier unten. ' +
      'Drück «Stopp», wenn du fertig bist, Esc, um es bleiben zu lassen.',
    staScrivendo: 'Ich schreibe auf, was du gesagt hast…',
    nonLoCambia: 'Liest das Klassenbuch und öffnet seine Seiten; ändert es nicht.',
    tasti: 'Enter sendet, Umschalt+Enter macht einen Zeilenumbruch.',
    comeSiChiede: 'So fragst du',
    staScrivendoTitolo: 'Ich schreibe auf, was du gesagt hast',
    smettiDiAscoltare: 'Zuhören beenden und aufschreiben, was ich gehört habe',
    detta: 'Frage diktieren',
    spento: 'Der Assistent ist ausgeschaltet',
    spentoTesto:
      'Man schaltet ihn in den Programmeinstellungen ein, unter «Assistent». Es braucht ein ' +
      'Modell auf dem Computer, das Werkzeuge aufrufen kann – ab 7 Milliarden Parametern –, ' +
      'und man wählt es dort aus. Nichts verlässt den Computer.',
    apriImpostazioni: 'Einstellungen öffnen',
    vuoto: 'Frag etwas zum Klassenbuch',
    vuotoTesto:
      'Zum Beispiel: «Welche Kurse habe ich dieses Jahr?», «Wie viele Stunden hat die 4a in ' +
      'Mathematik seit dem 1. September verpasst?». Unter jeder Antwort stehen die ' +
      'Prozeduren, die er dafür geöffnet hat: Steht keine da, hat er nichts gelesen.',
    seNeVedono: (mostrate, quante) => `Zu sehen sind ${mostrate} von ${quante}.`,
    microfonoNegato:
      'Das Mikrofon wurde nicht freigegeben: Man erlaubt es in den Windows-Einstellungen ' +
      'unter «Datenschutz und Sicherheit», «Mikrofon».',
    nessunMicrofono: 'An diesen Computer ist kein Mikrofon angeschlossen.',
    microfonoOccupato: 'Das Mikrofon wird von einem anderen Programm belegt.',
    microfonoChiuso: (dettaglio) => `Das Mikrofon liess sich nicht öffnen: ${dettaglio}`,
  },
  fr: {
    nonRisposto: 'Je n’ai pas réussi à répondre avec ce que j’ai lu.',
    fermato: 'Arrêté.',
    letto: (nome) => `Lu : ${nome}`,
    nonRiuscito: (nome, codice) => `Pas réussi : ${nome}${codice ? ` (${codice})` : ''}`,
    esaurito:
      'J’ai épuisé les lectures que je peux faire pour une question : la réponse est écrite ' +
      'avec ce que j’ai lu jusqu’ici. S’il manque quelque chose, pose une question plus précise.',
    pensando: 'Je réfléchis…',
    leggendo: 'Je lis le registre…',
    segnaposto: 'Que veux-tu savoir du registre ?',
    etichettaCampo: 'La question pour l’assistant',
    ferma: 'Arrêter',
    chiedi: 'Demander',
    continuoAdAscoltare: (motivo) => `${motivo} Je continue à t’écouter.`,
    tiAscolto:
      'Je t’écoute : ce que tu dis apparaît ci-dessous au fur et à mesure. ' +
      'Appuie sur « Arrêter » quand tu as fini, Échap pour laisser tomber.',
    staScrivendo: 'J’écris ce que tu as dit…',
    nonLoCambia: 'Il lit le registre et en ouvre les pages ; il ne le modifie pas.',
    tasti: 'Entrée envoie, Maj+Entrée va à la ligne.',
    comeSiChiede: 'Comment demander',
    staScrivendoTitolo: 'J’écris ce que tu as dit',
    smettiDiAscoltare: 'Arrêter d’écouter et écrire ce que j’ai entendu',
    detta: 'Dicter la question',
    spento: 'L’assistant est éteint',
    spentoTesto:
      'Il s’allume dans les paramètres du programme, sous « Assistant ». Il faut un modèle ' +
      'téléchargé sur la machine qui sache appeler des outils – à partir de 7 milliards de ' +
      'paramètres – et on le choisit là. Rien ne sort de l’ordinateur.',
    apriImpostazioni: 'Ouvrir les paramètres',
    vuoto: 'Demande quelque chose au registre',
    vuotoTesto:
      'Par exemple : « quels cours ai-je cette année ? », « combien d’heures la 4a a-t-elle ' +
      'manquées en mathématiques depuis le 1er septembre ? ». Sous chaque réponse figurent ' +
      'les procédures qu’il a ouvertes pour l’écrire : s’il n’y en a aucune, il n’a rien lu.',
    seNeVedono: (mostrate, quante) => `On en voit ${mostrate} sur ${quante}.`,
    microfonoNegato:
      'Le micro n’a pas été autorisé : on l’autorise dans les paramètres de Windows, sous ' +
      '« Confidentialité et sécurité », « Microphone ».',
    nessunMicrofono: 'Aucun micro n’est branché sur cet ordinateur.',
    microfonoOccupato: 'Le micro est occupé par un autre programme.',
    microfonoChiuso: (dettaglio) => `Le micro ne s’est pas ouvert : ${dettaglio}`,
  },
  en: {
    nonRisposto: 'I could not answer with what I read.',
    fermato: 'Stopped.',
    letto: (nome) => `Read: ${nome}`,
    nonRiuscito: (nome, codice) => `Failed: ${nome}${codice ? ` (${codice})` : ''}`,
    esaurito:
      'I have used up the reads I can make for one question: the answer is written with ' +
      'what I have read so far. If something is missing, ask something narrower.',
    pensando: 'Thinking…',
    leggendo: 'Reading the register…',
    segnaposto: 'What do you want to know about the register?',
    etichettaCampo: 'The question for the assistant',
    ferma: 'Stop',
    chiedi: 'Ask',
    continuoAdAscoltare: (motivo) => `${motivo} I’m still listening.`,
    tiAscolto:
      'I’m listening: what you say appears below as you go. ' +
      'Press “Stop” when you have finished, Esc to leave it.',
    staScrivendo: 'Writing down what you said…',
    nonLoCambia: 'It reads the register and opens its pages; it does not change it.',
    tasti: 'Enter sends, Shift+Enter starts a new line.',
    comeSiChiede: 'How to ask',
    staScrivendoTitolo: 'Writing down what you said',
    smettiDiAscoltare: 'Stop listening and write down what I heard',
    detta: 'Dictate the question',
    spento: 'The assistant is switched off',
    spentoTesto:
      'It is switched on in the program settings, under “Assistant”. It needs a model ' +
      'downloaded to the computer that can call tools — 7 billion parameters or more — and ' +
      'you choose it there. Nothing leaves the computer.',
    apriImpostazioni: 'Open settings',
    vuoto: 'Ask something about the register',
    vuotoTesto:
      'For example: “which courses do I have this year?”, “how many hours has 4a missed in ' +
      'maths since 1 September?”. Under each answer are the procedures it opened to write ' +
      'it: if there are none, it has read nothing.',
    seNeVedono: (mostrate, quante) => `Showing ${mostrate} of ${quante}.`,
    microfonoNegato:
      'The microphone was not allowed: you allow it in the Windows settings, under ' +
      '“Privacy & security”, “Microphone”.',
    nessunMicrofono: 'There is no microphone connected to this computer.',
    microfonoOccupato: 'The microphone is being used by another program.',
    microfonoChiuso: (dettaglio) => `The microphone did not open: ${dettaglio}`,
  },
})

// I testi dell'assistente attorno alla conversazione: il pulsante nella barra,
// la testata del riquadro (`assistant.ts`) e della finestra staccata
// (`assistantWindow.ts`), il menu del contesto. «Riattacca» sta qui con la
// frase che lo cita fra virgolette.

import { catalogo, perNumero } from '../i18n/index.js'

const it = {
  nessunModello: 'nessun modello',
  assistente: 'Assistente',
  portaDavanti: 'Porta davanti l’assistente',
  chiudi: 'Chiudi l’assistente',
  titoloStaccato: 'L’assistente è in una finestra a parte: porta davanti quella',
  titoloAperto: 'Chiude il riquadro dell’assistente',
  titoloChiuso: 'Chiedi del registro a parole tue: un modello locale legge e risponde',
  staccato: 'L’assistente è staccato',
  staccatoTesto:
    'La conversazione è in una finestra a parte. Da là, «Riattacca» la riporta qui ' +
    'com’era: quel che vi siete detti viaggia con lei.',
  portaDavantiFinestra: 'Porta davanti la finestra',
  senzaContesto: ' · senza contesto',
  contestoRidotto: (spente: number) => ` · contesto ridotto (${spente})`,
  suQuante: (dentro: string, quante: number, di: number) => `${dentro} · ${quante} su ${di}`,
  tendinaDetta: (campo: string, valore: string) =>
    `L’assistente sa che «${campo}» è ${valore}. Premi per non dirglielo.`,
  tendinaTaciuta: (campo: string) =>
    `L’assistente non sa niente di «${campo}». Premi per dirglielo.`,
  inUnGesto: 'In un gesto',
  cheCosaSa: 'Che cosa sa della pagina',
  contestoSpento: 'L’assistente non sa niente della pagina. Premi per scegliere che cosa dirgli.',
  contestoIntero:
    'L’assistente sa dove stai guardando: pagina, tendine, filtri, id, elenco a schermo. ' +
    'Premi per scegliere.',
  contestoMeno: (spente: number) =>
    `L’assistente sa dove stai guardando, meno ${spente} cos${spente === 1 ? 'a' : 'e'}. ` +
    'Premi per scegliere.',
  inFinestraAParte: 'in una finestra a parte',
  nonScrive: (modello: string) => `${modello} · non scrive`,
  spento: 'spento',
  dimentica: 'Dimentica la conversazione',
  stacca: 'Stacca l’assistente in una finestra sua',
  riattacca: 'Riattacca',
  riattaccaTitolo: 'Riporta l’assistente nel riquadro del registro',
}

export const testi = catalogo(it, {
  de: {
    nessunModello: 'kein Modell',
    assistente: 'Assistent',
    portaDavanti: 'Assistenten nach vorne holen',
    chiudi: 'Assistenten schliessen',
    titoloStaccato: 'Der Assistent ist in einem eigenen Fenster: Hol dieses nach vorne',
    titoloAperto: 'Schliesst den Bereich des Assistenten',
    titoloChiuso:
      'Frag das Klassenbuch in deinen eigenen Worten: Ein lokales Modell liest und antwortet',
    staccato: 'Der Assistent ist abgekoppelt',
    staccatoTesto:
      'Das Gespräch ist in einem eigenen Fenster. Dort holt «Wieder andocken» es so zurück, ' +
      'wie es war: Was ihr euch gesagt habt, kommt mit.',
    portaDavantiFinestra: 'Fenster nach vorne holen',
    senzaContesto: ' · ohne Kontext',
    contestoRidotto: (spente) => ` · Kontext eingeschränkt (${spente})`,
    suQuante: (dentro, quante, di) => `${dentro} · ${quante} von ${di}`,
    tendinaDetta: (campo, valore) =>
      `Der Assistent weiss, dass «${campo}» ${valore} ist. Drück, um es ihm nicht zu sagen.`,
    tendinaTaciuta: (campo) =>
      `Der Assistent weiss nichts über «${campo}». Drück, um es ihm zu sagen.`,
    inUnGesto: 'Mit einem Klick',
    cheCosaSa: 'Was er über die Seite weiss',
    contestoSpento:
      'Der Assistent weiss nichts über die Seite. Drück, um zu wählen, was er erfährt.',
    contestoIntero:
      'Der Assistent weiss, wo du hinschaust: Seite, Auswahlmenüs, Filter, IDs, Liste auf dem ' +
      'Bildschirm. Drück, um zu wählen.',
    contestoMeno: (spente) =>
      `Der Assistent weiss, wo du hinschaust, bis auf ${spente} ` +
      `${perNumero(spente, 'Sache', 'Sachen')}. Drück, um zu wählen.`,
    inFinestraAParte: 'in einem eigenen Fenster',
    nonScrive: (modello) => `${modello} · schreibt nicht`,
    spento: 'ausgeschaltet',
    dimentica: 'Gespräch vergessen',
    stacca: 'Assistenten in ein eigenes Fenster abkoppeln',
    riattacca: 'Wieder andocken',
    riattaccaTitolo: 'Holt den Assistenten in den Bereich des Klassenbuchs zurück',
  },
  fr: {
    nessunModello: 'aucun modèle',
    assistente: 'Assistant',
    portaDavanti: 'Ramener l’assistant au premier plan',
    chiudi: 'Fermer l’assistant',
    titoloStaccato: 'L’assistant est dans une fenêtre à part : ramène-la au premier plan',
    titoloAperto: 'Ferme le panneau de l’assistant',
    titoloChiuso: 'Interroge le registre avec tes mots : un modèle local lit et répond',
    staccato: 'L’assistant est détaché',
    staccatoTesto:
      'La conversation est dans une fenêtre à part. De là-bas, « Rattacher » la ramène ici ' +
      'telle qu’elle était : tout ce qui s’est dit voyage avec elle.',
    portaDavantiFinestra: 'Ramener la fenêtre au premier plan',
    senzaContesto: ' · sans contexte',
    contestoRidotto: (spente) => ` · contexte réduit (${spente})`,
    suQuante: (dentro, quante, di) => `${dentro} · ${quante} sur ${di}`,
    tendinaDetta: (campo, valore) =>
      `L’assistant sait que « ${campo} » est ${valore}. Appuie pour ne pas le lui dire.`,
    tendinaTaciuta: (campo) =>
      `L’assistant ne sait rien de « ${campo} ». Appuie pour le lui dire.`,
    inUnGesto: 'En un geste',
    cheCosaSa: 'Ce qu’il sait de la page',
    contestoSpento: 'L’assistant ne sait rien de la page. Appuie pour choisir ce que tu lui dis.',
    contestoIntero:
      'L’assistant sait où tu regardes : page, listes déroulantes, filtres, id, liste à ' +
      'l’écran. Appuie pour choisir.',
    contestoMeno: (spente) =>
      `L’assistant sait où tu regardes, sauf ${spente} ` +
      `${perNumero(spente, 'chose', 'choses')}. Appuie pour choisir.`,
    inFinestraAParte: 'dans une fenêtre à part',
    nonScrive: (modello) => `${modello} · n’écrit pas`,
    spento: 'éteint',
    dimentica: 'Oublier la conversation',
    stacca: 'Détacher l’assistant dans sa propre fenêtre',
    riattacca: 'Rattacher',
    riattaccaTitolo: 'Ramène l’assistant dans le panneau du registre',
  },
  en: {
    nessunModello: 'no model',
    assistente: 'Assistant',
    portaDavanti: 'Bring the assistant to the front',
    chiudi: 'Close the assistant',
    titoloStaccato: 'The assistant is in a separate window: bring that one to the front',
    titoloAperto: 'Closes the assistant panel',
    titoloChiuso: 'Ask the register in your own words: a local model reads and answers',
    staccato: 'The assistant is detached',
    staccatoTesto:
      'The conversation is in a separate window. From there, “Reattach” brings it back here ' +
      'as it was: what you have said to each other travels with it.',
    portaDavantiFinestra: 'Bring the window to the front',
    senzaContesto: ' · no context',
    contestoRidotto: (spente) => ` · reduced context (${spente})`,
    suQuante: (dentro, quante, di) => `${dentro} · ${quante} of ${di}`,
    tendinaDetta: (campo, valore) =>
      `The assistant knows that “${campo}” is ${valore}. Press to stop telling it.`,
    tendinaTaciuta: (campo) =>
      `The assistant knows nothing about “${campo}”. Press to tell it.`,
    inUnGesto: 'In one go',
    cheCosaSa: 'What it knows about the page',
    contestoSpento: 'The assistant knows nothing about the page. Press to choose what to tell it.',
    contestoIntero:
      'The assistant knows where you are looking: page, drop-downs, filters, ids, list on ' +
      'screen. Press to choose.',
    contestoMeno: (spente) =>
      `The assistant knows where you are looking, minus ${spente} ` +
      `${perNumero(spente, 'thing', 'things')}. Press to choose.`,
    inFinestraAParte: 'in a separate window',
    nonScrive: (modello) => `${modello} · does not write`,
    spento: 'off',
    dimentica: 'Forget the conversation',
    stacca: 'Detach the assistant into its own window',
    riattacca: 'Reattach',
    riattaccaTitolo: 'Brings the assistant back into the register’s panel',
  },
})

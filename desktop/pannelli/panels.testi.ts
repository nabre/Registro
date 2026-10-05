// Testi dei pannelli: titoli delle finestre accanto al registro (assistente,
// proiezione) e frasi di rifiuto di domande o azioni. «Regiklass» è il marchio,
// uguale in ogni lingua.

import { catalogo } from '#core/i18n/index.js'

const it = {
  // ------------------------------------------------------------ assistant.ts
  persaNelloSpostamento: 'La domanda si è persa nello spostamento: va rifatta.',
  finestraAssistente: 'Regiklass · assistente',
  paginaAssistente: 'Assistente',

  // ------------------------------------------------------------ projection.ts
  finestraProiezione: 'Regiklass · proiezione',
  paginaProiezione: 'Proiezione',

  // ------------------------------------------------------------ panel.ts
  nonSalvato: ' (non salvato)',
  principale: ' (principale)',
  troppeFinestre: (massimo: number) =>
    massimo === 1
      ? 'C’è già una finestra in più: chiudila per aprirne un’altra.'
      : `Ci sono già ${massimo} finestre in più: chiudine una per aprirne un’altra.`,
  senzaDocumento: 'Apri un anno per aprirne un’altra finestra.',
  scrive: (procedura: string) =>
    `«${procedura}» scrive: va chiesta come azione, non come domanda.`,
  azioneSconosciuta: (tipo: string) => `Azione sconosciuta: «${tipo}».`,
  domandaFallita: 'La lettura non è riuscita: riprova.',
}

export const testi = catalogo(it, {
  de: {
    persaNelloSpostamento:
      'Die Frage ist beim Verschieben verloren gegangen: Sie muss neu gestellt werden.',
    finestraAssistente: 'Regiklass · Assistent',
    paginaAssistente: 'Assistent',
    finestraProiezione: 'Regiklass · Projektion',
    paginaProiezione: 'Projektion',
    nonSalvato: ' (nicht gespeichert)',
    principale: ' (Hauptfenster)',
    troppeFinestre: (massimo) =>
      massimo === 1
        ? 'Es ist schon ein weiteres Fenster offen: Schliess es, um ein anderes zu öffnen.'
        : `Es sind schon ${massimo} weitere Fenster offen: Schliess eines, um ein anderes zu öffnen.`,
    senzaDocumento: 'Öffne ein Schuljahr, um ein weiteres Fenster davon zu öffnen.',
    scrive: (procedura) =>
      `«${procedura}» schreibt: Das muss als Aktion angefragt werden, nicht als Frage.`,
    azioneSconosciuta: (tipo) => `Unbekannte Aktion: «${tipo}».`,
    domandaFallita: 'Das Lesen hat nicht geklappt: Versuch es noch einmal.',
  },
  fr: {
    persaNelloSpostamento:
      'La question s’est perdue pendant le déplacement : il faut la reposer.',
    finestraAssistente: 'Regiklass · assistant',
    paginaAssistente: 'Assistant',
    finestraProiezione: 'Regiklass · projection',
    paginaProiezione: 'Projection',
    nonSalvato: ' (non enregistré)',
    principale: ' (principale)',
    troppeFinestre: (massimo) =>
      massimo === 1
        ? 'Une fenêtre supplémentaire est déjà ouverte : ferme-la pour en ouvrir une autre.'
        : `Il y a déjà ${massimo} fenêtres supplémentaires : ferme-en une pour en ouvrir une autre.`,
    senzaDocumento: 'Ouvre une année pour en ouvrir une autre fenêtre.',
    scrive: (procedura) =>
      `« ${procedura} » écrit : il faut la demander comme action, pas comme question.`,
    azioneSconosciuta: (tipo) => `Action inconnue : « ${tipo} ».`,
    domandaFallita: 'La lecture n’a pas abouti : réessaie.',
  },
  en: {
    persaNelloSpostamento: 'The question was lost in the move: it needs to be asked again.',
    finestraAssistente: 'Regiklass · assistant',
    paginaAssistente: 'Assistant',
    finestraProiezione: 'Regiklass · projection',
    paginaProiezione: 'Projection',
    nonSalvato: ' (not saved)',
    principale: ' (main)',
    troppeFinestre: (massimo) =>
      massimo === 1
        ? 'There is already one extra window: close it to open another.'
        : `There are already ${massimo} extra windows: close one to open another.`,
    senzaDocumento: 'Open a year to open another window on it.',
    scrive: (procedura) =>
      `“${procedura}” writes: it must be requested as an action, not as a question.`,
    azioneSconosciuta: (tipo) => `Unknown action: “${tipo}”.`,
    domandaFallita: 'Reading didn’t work: try again.',
  },
})

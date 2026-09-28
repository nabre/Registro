// Testi dei pannelli: titoli delle finestre accanto al registro (assistente,
// proiezione) e frasi di rifiuto di domande o azioni. «Regiklass» è il marchio,
// uguale in ogni lingua.

import { catalogo } from '.../../../core/i18n/index.js'

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
  scrive: (procedura: string) =>
    `«${procedura}» scrive: va chiesta come azione, non come domanda.`,
  azioneSconosciuta: (tipo: string) => `Azione sconosciuta: «${tipo}».`,
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
    scrive: (procedura) =>
      `«${procedura}» schreibt: Das muss als Aktion angefragt werden, nicht als Frage.`,
    azioneSconosciuta: (tipo) => `Unbekannte Aktion: «${tipo}».`,
  },
  fr: {
    persaNelloSpostamento:
      'La question s’est perdue pendant le déplacement : il faut la reposer.',
    finestraAssistente: 'Regiklass · assistant',
    paginaAssistente: 'Assistant',
    finestraProiezione: 'Regiklass · projection',
    paginaProiezione: 'Projection',
    nonSalvato: ' (non enregistré)',
    scrive: (procedura) =>
      `« ${procedura} » écrit : il faut la demander comme action, pas comme question.`,
    azioneSconosciuta: (tipo) => `Action inconnue : « ${tipo} ».`,
  },
  en: {
    persaNelloSpostamento: 'The question was lost in the move: it needs to be asked again.',
    finestraAssistente: 'Regiklass · assistant',
    paginaAssistente: 'Assistant',
    finestraProiezione: 'Regiklass · projection',
    paginaProiezione: 'Projection',
    nonSalvato: ' (not saved)',
    scrive: (procedura) =>
      `“${procedura}” writes: it must be requested as an action, not as a question.`,
    azioneSconosciuta: (tipo) => `Unknown action: “${tipo}”.`,
  },
})

// I testi del ponte con l'host (`bridge.ts`): quel che si dice quando una
// risposta non arriva come doveva.

import { catalogo } from '../i18n/index.js'

const it = {
  nonRiuscito: 'Non riuscito.',
  assistenteMuto: 'L’assistente non ha risposto.',
  rispostaPersa:
    'La risposta si è persa per strada: l’assistente non ha detto niente. Rifai la domanda.',
  trascrizioneFallita: 'La trascrizione non è riuscita.',
}

export const testi = catalogo(it, {
  de: {
    nonRiuscito: 'Nicht gelungen.',
    assistenteMuto: 'Der Assistent hat nicht geantwortet.',
    rispostaPersa:
      'Die Antwort ist unterwegs verloren gegangen: Der Assistent hat nichts gesagt. Stell die ' +
      'Frage noch einmal.',
    trascrizioneFallita: 'Die Transkription ist nicht gelungen.',
  },
  fr: {
    nonRiuscito: 'Échec.',
    assistenteMuto: 'L’assistant n’a pas répondu.',
    rispostaPersa:
      'La réponse s’est perdue en route : l’assistant n’a rien dit. Pose de nouveau la question.',
    trascrizioneFallita: 'La transcription n’a pas abouti.',
  },
  en: {
    nonRiuscito: 'That didn’t work.',
    assistenteMuto: 'The assistant did not answer.',
    rispostaPersa: 'The answer got lost on the way: the assistant said nothing. Ask again.',
    trascrizioneFallita: 'The transcription failed.',
  },
})

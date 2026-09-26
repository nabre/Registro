// I testi delle finestre (`modal.ts`): la domanda prima di buttare via quel
// che si è scritto. I pulsanti generici — Salva, Annulla, Chiudi, Conferma —
// sono quelli di `parole()`.

import { catalogo } from '../../i18n/index.js'

const it = {
  lasciareTitolo: 'Lasciare le modifiche?',
  lasciareTesto: 'Quel che hai scritto in questa finestra non è salvato: chiudendola va perso.',
  lascia: 'Lascia',
}

export const testi = catalogo(it, {
  de: {
    lasciareTitolo: 'Änderungen verwerfen?',
    lasciareTesto:
      'Was du in diesem Fenster geschrieben hast, ist nicht gespeichert: Beim Schliessen geht ' +
      'es verloren.',
    lascia: 'Verwerfen',
  },
  fr: {
    lasciareTitolo: 'Abandonner les modifications ?',
    lasciareTesto:
      'Ce que tu as écrit dans cette fenêtre n’est pas enregistré : en la fermant, il est perdu.',
    lascia: 'Abandonner',
  },
  en: {
    lasciareTitolo: 'Discard the changes?',
    lasciareTesto: 'What you wrote in this window is not saved: closing it loses it.',
    lascia: 'Discard',
  },
})

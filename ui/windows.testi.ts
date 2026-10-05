// Testi delle finestre del registro: l'etichetta nella barra del titolo, il
// ritorno alla principale, il menu delle finestre.

import { catalogo } from '#core/i18n/index.js'

const it = {
  principale: (aperte: number) => `Principale · ${aperte}`,
  principaleTitolo: (aperte: number) =>
    `Questa è la finestra principale; ne sono aperte ${aperte}. Premi per l’elenco.`,
  figlia: (numero: number, pagina: string) => (pagina ? `Finestra ${numero} · ${pagina}` : `Finestra ${numero}`),
  figliaTitolo:
    'Una finestra in più del registro: si chiude con la principale, e le scritture valgono per tutte.',
  allaPrincipale: '↖ Principale',
  allaPrincipaleTitolo: 'Porta davanti la finestra principale (Ctrl+Maiusc+1)',
  vociDellaFinestra: (numero: number, pagina: string) =>
    numero === 1
      ? `Principale${pagina ? ` · ${pagina}` : ''}`
      : `Finestra ${numero}${pagina ? ` · ${pagina}` : ''}`,
  portaDavanti: 'Porta davanti',
  chiudi: 'Chiudi la finestra',
}

export const testi = catalogo(it, {
  de: {
    principale: (aperte) => `Hauptfenster · ${aperte}`,
    principaleTitolo: (aperte) =>
      `Das ist das Hauptfenster; offen sind ${aperte}. Klick für die Liste.`,
    figlia: (numero, pagina) => (pagina ? `Fenster ${numero} · ${pagina}` : `Fenster ${numero}`),
    figliaTitolo:
      'Ein weiteres Fenster des Klassenbuchs: Es schliesst mit dem Hauptfenster, und Änderungen gelten für alle.',
    allaPrincipale: '↖ Hauptfenster',
    allaPrincipaleTitolo: 'Holt das Hauptfenster nach vorne (Ctrl+Umschalt+1)',
    vociDellaFinestra: (numero, pagina) =>
      numero === 1
        ? `Hauptfenster${pagina ? ` · ${pagina}` : ''}`
        : `Fenster ${numero}${pagina ? ` · ${pagina}` : ''}`,
    portaDavanti: 'Nach vorne holen',
    chiudi: 'Fenster schliessen',
  },
  fr: {
    principale: (aperte) => `Principale · ${aperte}`,
    principaleTitolo: (aperte) =>
      `C’est la fenêtre principale ; ${aperte} sont ouvertes. Clique pour la liste.`,
    figlia: (numero, pagina) => (pagina ? `Fenêtre ${numero} · ${pagina}` : `Fenêtre ${numero}`),
    figliaTitolo:
      'Une fenêtre supplémentaire du registre : elle se ferme avec la principale, et les modifications valent pour toutes.',
    allaPrincipale: '↖ Principale',
    allaPrincipaleTitolo: 'Met au premier plan la fenêtre principale (Ctrl+Maj+1)',
    vociDellaFinestra: (numero, pagina) =>
      numero === 1
        ? `Principale${pagina ? ` · ${pagina}` : ''}`
        : `Fenêtre ${numero}${pagina ? ` · ${pagina}` : ''}`,
    portaDavanti: 'Mettre au premier plan',
    chiudi: 'Fermer la fenêtre',
  },
  en: {
    principale: (aperte) => `Main · ${aperte}`,
    principaleTitolo: (aperte) =>
      `This is the main window; ${aperte} are open. Click for the list.`,
    figlia: (numero, pagina) => (pagina ? `Window ${numero} · ${pagina}` : `Window ${numero}`),
    figliaTitolo:
      'An extra register window: it closes with the main one, and changes apply to all.',
    allaPrincipale: '↖ Main',
    allaPrincipaleTitolo: 'Brings the main window to the front (Ctrl+Shift+1)',
    vociDellaFinestra: (numero, pagina) =>
      numero === 1
        ? `Main${pagina ? ` · ${pagina}` : ''}`
        : `Window ${numero}${pagina ? ` · ${pagina}` : ''}`,
    portaDavanti: 'Bring to front',
    chiudi: 'Close the window',
  },
})

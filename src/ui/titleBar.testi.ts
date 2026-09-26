// I testi della barra del titolo (`titleBar.ts`): il nome del documento al
// centro, i passi della storia e il filetto degli aggiornamenti.

import { catalogo } from '../i18n/index.js'
import { plurale } from '../domain/text.js'

const it = {
  nonSalvatoTitolo: (percorso: string) =>
    `${percorso} — anno nuovo non ancora salvato: Ctrl+S per scegliere nome e posto`,
  nessunAnnoTitolo: 'Nessun anno aperto: si apre da «File»',
  nessunAnno: 'Nessun anno aperto',
  nonSalvato: '(non salvato)',
  nienteDaAnnullare: 'niente da annullare',
  nienteDaRipristinare: 'niente da ripristinare',
  passi: (quanti: number) => plurale(quanti, 'passo', 'passi'),
  apriAggiornamenti: (frase: string) => `${frase}\nApri gli aggiornamenti`,
  nascondi: 'Nascondi fino alla prossima novità',
}

export const testi = catalogo(it, {
  de: {
    nonSalvatoTitolo: (percorso) =>
      `${percorso} — neues Schuljahr, noch nicht gespeichert: Ctrl+S, um Namen und Ort zu wählen`,
    nessunAnnoTitolo: 'Kein Schuljahr geöffnet: Man öffnet es über «Datei»',
    nessunAnno: 'Kein Schuljahr geöffnet',
    nonSalvato: '(nicht gespeichert)',
    nienteDaAnnullare: 'nichts rückgängig zu machen',
    nienteDaRipristinare: 'nichts zu wiederholen',
    passi: (quanti) => plurale(quanti, 'Schritt', 'Schritte'),
    apriAggiornamenti: (frase) => `${frase}\nÖffne die Aktualisierungen`,
    nascondi: 'Bis zur nächsten Neuigkeit ausblenden',
  },
  fr: {
    nonSalvatoTitolo: (percorso) =>
      `${percorso} — nouvelle année pas encore enregistrée : Ctrl+S pour choisir le nom et ` +
      'l’emplacement',
    nessunAnnoTitolo: 'Aucune année ouverte : elle s’ouvre depuis « Fichier »',
    nessunAnno: 'Aucune année ouverte',
    nonSalvato: '(non enregistrée)',
    nienteDaAnnullare: 'rien à annuler',
    nienteDaRipristinare: 'rien à rétablir',
    passi: (quanti) => plurale(quanti, 'pas', 'pas'),
    apriAggiornamenti: (frase) => `${frase}\nOuvre les mises à jour`,
    nascondi: 'Masquer jusqu’à la prochaine nouveauté',
  },
  en: {
    nonSalvatoTitolo: (percorso) =>
      `${percorso} — new year not saved yet: Ctrl+S to choose a name and a place`,
    nessunAnnoTitolo: 'No year open: open one from “File”',
    nessunAnno: 'No year open',
    nonSalvato: '(unsaved)',
    nienteDaAnnullare: 'nothing to undo',
    nienteDaRipristinare: 'nothing to redo',
    passi: (quanti) => plurale(quanti, 'step', 'steps'),
    apriAggiornamenti: (frase) => `${frase}\nOpen the updates`,
    nascondi: 'Hide until there is something new',
  },
})

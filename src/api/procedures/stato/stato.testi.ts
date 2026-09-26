// I testi delle procedure di `stato`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  leggi: {
    titolo: 'Chiede lo stato del registro, e rilegge la cartella dei modelli',
  },
  ricarica: {
    titolo: 'Rilegge il documento aperto e la cartella dei modelli',
  },
  salva: {
    titolo: 'Scrive subito quel che è in attesa: il Ctrl+S',
  },
}

export const testi = catalogo(it, {
  de: {
    leggi: {
      titolo: 'Fragt den Zustand des Klassenbuchs ab und liest den Vorlagenordner neu ein',
    },
    ricarica: {
      titolo: 'Liest das geöffnete Dokument und den Vorlagenordner neu ein',
    },
    salva: {
      titolo: 'Schreibt sofort, was noch aussteht: das Ctrl+S',
    },
  },
  fr: {
    leggi: {
      titolo: 'Demande l’état du registre, et relit le dossier des modèles',
    },
    ricarica: {
      titolo: 'Relit le document ouvert et le dossier des modèles',
    },
    salva: {
      titolo: 'Écrit tout de suite ce qui est en attente : le Ctrl+S',
    },
  },
  en: {
    leggi: {
      titolo: 'Asks for the state of the register, and rereads the templates folder',
    },
    ricarica: {
      titolo: 'Rereads the open document and the templates folder',
    },
    salva: {
      titolo: 'Writes what is pending straight away: Ctrl+S',
    },
  },
})

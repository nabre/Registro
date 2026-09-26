// I testi del riquadro d'avvio: la fase di partenza, finché il main process
// non ne annuncia una, e la versione sotto.

import { catalogo } from '../../../src/i18n/index.js'

const it = {
  avvio: 'Avvio del registro…',
  versione: (versione: string) => `Versione ${versione}`,
}

export const testi = catalogo(it, {
  de: { avvio: 'Klassenbuch wird gestartet…', versione: (versione) => `Version ${versione}` },
  fr: { avvio: 'Démarrage du registre…', versione: (versione) => `Version ${versione}` },
  en: { avvio: 'Starting the register…', versione: (versione) => `Version ${versione}` },
})

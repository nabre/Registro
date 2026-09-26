// Il testo del riquadro d'avvio che il main process conosce: la fase di
// partenza, prima che qualcuno ne annunci un'altra.

import { catalogo } from '../../src/i18n/index.js'

const it = {
  avvio: 'Avvio del registro…',
}

export const testi = catalogo(it, {
  de: { avvio: 'Klassenbuch wird gestartet…' },
  fr: { avvio: 'Démarrage du registre…' },
  en: { avvio: 'Starting the register…' },
})

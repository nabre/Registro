// I testi di `projection.ts`.

import { catalogo } from '#core/i18n/index.js'

const it = {
  spento: 'Lo schermo per la classe non è disponibile: il registro non è acceso.',
}

export const testi = catalogo(it, {
  de: { spento: 'Der Bildschirm für die Klasse ist nicht verfügbar: Das Klassenbuch ist nicht gestartet.' },
  fr: { spento: 'L’écran pour la classe n’est pas disponible : le registre n’est pas démarré.' },
  en: { spento: 'The class screen isn’t available: the register isn’t running.' },
})

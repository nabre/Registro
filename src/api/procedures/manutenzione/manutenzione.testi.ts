// I testi delle procedure di `manutenzione`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  ripara: {
    titolo: 'Applica tutte le correzioni che il registro sa fare da solo',
  },
}

export const testi = catalogo(it, {
  de: {
    ripara: {
      titolo: 'Wendet alle Korrekturen an, die das Klassenbuch selbst vornehmen kann',
    },
  },
  fr: {
    ripara: {
      titolo: 'Applique toutes les corrections que le registre sait faire tout seul',
    },
  },
  en: {
    ripara: {
      titolo: 'Applies every correction the register knows how to make on its own',
    },
  },
})

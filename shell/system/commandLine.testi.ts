// Il testo del ponte di `regi`: la riga di commento che lo apre, per chi lo
// trova e lo apre in un editor.

import { catalogo } from '../../src/i18n/index.js'

const it = {
  avvertenza: 'Scritto dal registro a ogni avvio: quel che si cambia qui si perde.',
}

export const testi = catalogo(it, {
  de: { avvertenza: 'Vom Klassenbuch bei jedem Start geschrieben: Was du hier änderst, geht verloren.' },
  fr: { avvertenza: 'Écrit par le registre à chaque démarrage : ce qu’on change ici est perdu.' },
  en: { avvertenza: 'Written by the register at every start: anything you change here is lost.' },
})

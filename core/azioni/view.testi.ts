// I testi di `view.ts`.

import { catalogo } from '../i18n/index.js'

const it = {
  nonAperto: 'Il registro non è aperto: non c’è nessuna pagina da mostrare.',
}

export const testi = catalogo(it, {
  de: { nonAperto: 'Das Klassenbuch ist nicht geöffnet: Es gibt keine Seite zum Anzeigen.' },
  fr: { nonAperto: 'Le registre n’est pas ouvert : il n’y a aucune page à afficher.' },
  en: { nonAperto: 'The register isn’t open: there’s no page to show.' },
})

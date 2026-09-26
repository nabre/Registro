// I testi di `updates.ts`: perché un gesto sugli aggiornamenti non ha senso adesso.

import { catalogo } from '../i18n/index.js'

const it = {
  nonSupportato: 'Questo registro non si aggiorna da sé.',
  nienteDaScaricare: 'Non c’è una versione nuova da scaricare: prima si controlla.',
  nienteDaInstallare: 'La versione nuova non è ancora scaricata: non c’è niente da installare.',
}

export const testi = catalogo(it, {
  de: {
    nonSupportato: 'Dieses Klassenbuch aktualisiert sich nicht selbst.',
    nienteDaScaricare: 'Es gibt keine neue Version zum Herunterladen: Suche zuerst nach Aktualisierungen.',
    nienteDaInstallare:
      'Die neue Version ist noch nicht heruntergeladen: Es gibt nichts zu installieren.',
  },
  fr: {
    nonSupportato: 'Ce registre ne se met pas à jour tout seul.',
    nienteDaScaricare:
      'Il n’y a pas de nouvelle version à télécharger : il faut d’abord rechercher les mises à jour.',
    nienteDaInstallare:
      'La nouvelle version n’est pas encore téléchargée : il n’y a rien à installer.',
  },
  en: {
    nonSupportato: 'This register doesn’t update itself.',
    nienteDaScaricare: 'There’s no new version to download: check for updates first.',
    nienteDaInstallare: 'The new version hasn’t been downloaded yet: there’s nothing to install.',
  },
})

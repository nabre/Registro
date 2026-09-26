// I testi delle procedure di `posta`. Si leggono al momento dell'uso, mai al
// caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  collega: {
    titolo: 'Collega la casella: accesso dal browser, prova, e si salva solo se il server accetta',
  },
  invioProva: {
    titolo: 'Manda una mail di prova a un indirizzo che si sceglie',
  },
  prova: {
    titolo: 'Domanda alla casella di chi è, senza mandare niente',
  },
  scollega: {
    titolo: 'Toglie dal portachiavi quel che apre la casella: si torna alle bozze',
  },
}

export const testi = catalogo(it, {
  de: {
    collega: {
      titolo:
        'Verbindet das Postfach: Anmeldung im Browser, Test, und gespeichert wird nur, ' +
        'wenn der Server zustimmt',
    },
    invioProva: {
      titolo: 'Sendet eine Test-E-Mail an eine frei gewählte Adresse',
    },
    prova: {
      titolo: 'Fragt das Postfach, wem es gehört, ohne etwas zu senden',
    },
    scollega: {
      titolo:
        'Entfernt aus dem Schlüsselbund, was das Postfach öffnet: Es gibt wieder nur Entwürfe',
    },
  },
  fr: {
    collega: {
      titolo:
        'Connecte la boîte aux lettres : connexion dans le navigateur, test, et on n’enregistre ' +
        'que si le serveur accepte',
    },
    invioProva: {
      titolo: 'Envoie un e-mail de test à une adresse au choix',
    },
    prova: {
      titolo: 'Demande à la boîte aux lettres à qui elle appartient, sans rien envoyer',
    },
    scollega: {
      titolo:
        'Retire du trousseau ce qui ouvre la boîte aux lettres : on revient aux brouillons',
    },
  },
  en: {
    collega: {
      titolo:
        'Connects the mailbox: sign-in in the browser, a test, and it is saved only if the ' +
        'server accepts',
    },
    invioProva: {
      titolo: 'Sends a test email to an address of your choice',
    },
    prova: {
      titolo: 'Asks the mailbox whose it is, without sending anything',
    },
    scollega: {
      titolo: 'Removes from the keychain what opens the mailbox: back to drafts',
    },
  },
})

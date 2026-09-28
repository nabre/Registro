// I testi delle procedure di `microsoft`. Si leggono al momento dell'uso, mai
// al caricamento.

import { catalogo } from '../../../core/i18n/index.js'

const it = {
  aggiungi: {
    titolo: 'Collega un account Microsoft per cercare i documenti nel suo OneDrive: accesso dal browser',
    indirizzo: 'L’indirizzo con cui si entra; senza, lo chiede il registro',
  },
  togli: {
    titolo: 'Scollega un account Microsoft: toglie dal portachiavi il permesso di leggere OneDrive',
    indirizzo: 'L’indirizzo dell’account, come compare nell’elenco',
  },
}

export const testi = catalogo(it, {
  de: {
    aggiungi: {
      titolo:
        'Verbindet ein Microsoft-Konto, um Dokumente in seinem OneDrive zu suchen: Anmeldung im ' +
        'Browser',
      indirizzo: 'Die Adresse, mit der man sich anmeldet; ohne fragt das Klassenbuch danach',
    },
    togli: {
      titolo:
        'Trennt ein Microsoft-Konto: entfernt die Berechtigung, OneDrive zu lesen, aus dem ' +
        'Schlüsselbund',
      indirizzo: 'Die Adresse des Kontos, wie sie in der Liste steht',
    },
  },
  fr: {
    aggiungi: {
      titolo:
        'Connecte un compte Microsoft pour chercher les documents dans son OneDrive : connexion ' +
        'dans le navigateur',
      indirizzo: 'L’adresse de connexion ; sans elle, le registre la demande',
    },
    togli: {
      titolo:
        'Déconnecte un compte Microsoft : retire du trousseau l’autorisation de lire OneDrive',
      indirizzo: 'L’adresse du compte, telle qu’elle figure dans la liste',
    },
  },
  en: {
    aggiungi: {
      titolo: 'Connects a Microsoft account to look for documents in its OneDrive: sign-in in the browser',
      indirizzo: 'The address used to sign in; without it, the register asks',
    },
    togli: {
      titolo: 'Disconnects a Microsoft account: removes the permission to read OneDrive from the keychain',
      indirizzo: 'The account’s address, as it appears in the list',
    },
  },
})

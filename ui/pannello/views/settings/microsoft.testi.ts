// I testi della scheda degli account Microsoft (`microsoft.ts`).

import { catalogo } from '../../../../core/i18n/index.js'

const it = {
  titolo: 'Account Microsoft',
  aiuto:
    'Gli account con cui il registro cerca i documenti .regi su OneDrive. Quelli che il client ' +
    'di OneDrive sincronizza su questo computer compaiono da soli e si sfogliano senza ' +
    'accesso. Gli altri si collegano dal browser, come la posta, se la scuola lo permette; il ' +
    'permesso resta nel portachiavi del sistema. Il registro legge soltanto: su OneDrive non ' +
    'scrive niente.',
  aggiungi: 'Aggiungi account',
  aggiungiAiuto: 'Chiede l’indirizzo e apre l’accesso Microsoft nel browser',
  nessuno:
    'Nessun account ancora. Se usi il client di OneDrive, accedi lì e l’account compare qui; ' +
    'altrimenti aggiungine uno.',
  sulComputer: 'Sincronizzato su questo computer',
  onedriveCollegato: 'OneDrive collegato',
  onedriveDaCollegare: 'OneDrive da collegare',
  casellaPosta: 'Casella della posta',
  collega: 'Collega OneDrive',
  collegaAiuto:
    'Apre l’accesso Microsoft nel browser: il permesso della posta non vale per OneDrive',
  sfoglia: 'Sfoglia OneDrive',
  sfogliaAiuto: 'Cartelle e documenti .regi di questo account',
  scollega: 'Scollega',
  scollegaAiuto: 'Toglie dal portachiavi il permesso di leggere OneDrive',
  scollegare: (indirizzo: string) => `Scollegare ${indirizzo}?`,
  scollegareTesto:
    'Il registro non potrà più cercare nel suo OneDrive finché non lo ricolleghi. I documenti ' +
    'già aperti restano dove sono, e la posta non cambia.',
  nota:
    'Un documento sincronizzato sul computer dal client di OneDrive si apre da lì, e le ' +
    'modifiche tornano su OneDrive da sole. Uno che non lo è si scarica in una cartella a ' +
    'scelta: quella copia non torna su OneDrive.',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Microsoft-Konten',
    aiuto:
      'Die Konten, mit denen das Klassenbuch .regi-Dokumente auf OneDrive sucht. Konten, die ' +
      'der OneDrive-Client auf diesem Computer synchronisiert, erscheinen von selbst und lassen ' +
      'sich ohne Anmeldung durchsuchen. Die anderen verbindest du im Browser, wie die E-Mail, ' +
      'wenn die Schule es erlaubt; die Berechtigung bleibt im Schlüsselbund des Systems. Das ' +
      'Klassenbuch liest nur: Auf OneDrive schreibt es nichts.',
    aggiungi: 'Konto hinzufügen',
    aggiungiAiuto: 'Fragt nach der Adresse und öffnet die Microsoft-Anmeldung im Browser',
    nessuno:
      'Noch kein Konto. Wenn du den OneDrive-Client nutzt, meldest du dich dort an und das ' +
      'Konto erscheint hier; sonst füge eines hinzu.',
    sulComputer: 'Auf diesem Computer synchronisiert',
    onedriveCollegato: 'OneDrive verbunden',
    onedriveDaCollegare: 'OneDrive nicht verbunden',
    casellaPosta: 'E-Mail-Postfach',
    collega: 'OneDrive verbinden',
    collegaAiuto:
      'Öffnet die Microsoft-Anmeldung im Browser: Die Berechtigung der E-Mail gilt nicht für ' +
      'OneDrive',
    sfoglia: 'OneDrive durchsuchen',
    sfogliaAiuto: 'Ordner und .regi-Dokumente dieses Kontos',
    scollega: 'Trennen',
    scollegaAiuto: 'Entfernt die Berechtigung, OneDrive zu lesen, aus dem Schlüsselbund',
    scollegare: (indirizzo) => `${indirizzo} trennen?`,
    scollegareTesto:
      'Das Klassenbuch kann nicht mehr in seinem OneDrive suchen, bis du es neu verbindest. ' +
      'Bereits geöffnete Dokumente bleiben, wo sie sind, und die E-Mail ändert sich nicht.',
    nota:
      'Ein Dokument, das der OneDrive-Client auf dem Computer synchronisiert, wird von dort ' +
      'geöffnet, und die Änderungen gehen von selbst zurück auf OneDrive. Eines, das es nicht ' +
      'ist, wird in einen Ordner deiner Wahl heruntergeladen: Diese Kopie geht nicht zurück auf ' +
      'OneDrive.',
  },
  fr: {
    titolo: 'Comptes Microsoft',
    aiuto:
      'Les comptes avec lesquels le registre cherche les documents .regi sur OneDrive. Ceux que ' +
      'le client OneDrive synchronise sur cet ordinateur apparaissent tout seuls et se ' +
      'parcourent sans connexion. Les autres se connectent dans le navigateur, comme les ' +
      'e-mails, si l’école le permet ; l’autorisation reste dans le trousseau du système. Le ' +
      'registre ne fait que lire : il n’écrit rien sur OneDrive.',
    aggiungi: 'Ajouter un compte',
    aggiungiAiuto: 'Demande l’adresse et ouvre la connexion Microsoft dans le navigateur',
    nessuno:
      'Aucun compte pour l’instant. Si tu utilises le client OneDrive, connecte-toi là et le ' +
      'compte apparaît ici ; sinon ajoutes-en un.',
    sulComputer: 'Synchronisé sur cet ordinateur',
    onedriveCollegato: 'OneDrive connecté',
    onedriveDaCollegare: 'OneDrive à connecter',
    casellaPosta: 'Boîte aux lettres',
    collega: 'Connecter OneDrive',
    collegaAiuto:
      'Ouvre la connexion Microsoft dans le navigateur : l’autorisation des e-mails ne vaut ' +
      'pas pour OneDrive',
    sfoglia: 'Parcourir OneDrive',
    sfogliaAiuto: 'Dossiers et documents .regi de ce compte',
    scollega: 'Déconnecter',
    scollegaAiuto: 'Retire du trousseau l’autorisation de lire OneDrive',
    scollegare: (indirizzo) => `Déconnecter ${indirizzo} ?`,
    scollegareTesto:
      'Le registre ne pourra plus chercher dans son OneDrive tant que tu ne le reconnectes pas. ' +
      'Les documents déjà ouverts restent où ils sont, et les e-mails ne changent pas.',
    nota:
      'Un document synchronisé sur l’ordinateur par le client OneDrive s’ouvre depuis là, et ' +
      'les modifications retournent sur OneDrive toutes seules. Un document qui ne l’est pas ' +
      'se télécharge dans un dossier au choix : cette copie ne retourne pas sur OneDrive.',
  },
  en: {
    titolo: 'Microsoft accounts',
    aiuto:
      'The accounts the register uses to look for .regi documents on OneDrive. Those the ' +
      'OneDrive client syncs on this computer appear by themselves and can be browsed without ' +
      'signing in. The others are connected in the browser, like email, if the school allows ' +
      'it; the permission stays in the system keychain. The register only reads: it writes ' +
      'nothing to OneDrive.',
    aggiungi: 'Add account',
    aggiungiAiuto: 'Asks for the address and opens the Microsoft sign-in in the browser',
    nessuno:
      'No account yet. If you use the OneDrive client, sign in there and the account appears ' +
      'here; otherwise add one.',
    sulComputer: 'Synced on this computer',
    onedriveCollegato: 'OneDrive connected',
    onedriveDaCollegare: 'OneDrive not connected',
    casellaPosta: 'Email mailbox',
    collega: 'Connect OneDrive',
    collegaAiuto:
      'Opens the Microsoft sign-in in the browser: the email permission does not cover OneDrive',
    sfoglia: 'Browse OneDrive',
    sfogliaAiuto: 'Folders and .regi documents of this account',
    scollega: 'Disconnect',
    scollegaAiuto: 'Removes the permission to read OneDrive from the keychain',
    scollegare: (indirizzo) => `Disconnect ${indirizzo}?`,
    scollegareTesto:
      'The register can no longer look in its OneDrive until you reconnect it. Documents ' +
      'already open stay where they are, and email does not change.',
    nota:
      'A document the OneDrive client syncs on the computer opens from there, and changes go ' +
      'back to OneDrive by themselves. One that is not synced is downloaded to a folder of your ' +
      'choice: that copy does not go back to OneDrive.',
  },
})

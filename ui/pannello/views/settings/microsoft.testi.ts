// I testi della scheda degli account Microsoft (`microsoft.ts`).

import { catalogo } from '../../../../core/i18n/index.js'

const it = {
  titolo: 'Account',
  aiuto:
    'Un account Microsoft sa fare due cose per il registro, e ognuna ha il suo permesso: la ' +
    'Posta — la casella da cui partono le comunicazioni — e OneDrive, dove il registro cerca i ' +
    'documenti .regi e legge soltanto. Gli account che il client di OneDrive sincronizza su ' +
    'questo computer compaiono da soli e si sfogliano senza accesso; gli altri si collegano dal ' +
    'browser, se la scuola lo permette. I permessi restano nel portachiavi del sistema.',
  posta: 'Posta',
  onedrive: 'OneDrive',
  nonLaCasella: 'non è la casella del registro',
  azzera: 'Azzera',
  azzeraAiuto: 'Toglie gettone, casella, mittente e invio diretto: il collegamento si rifà da capo',
  azzerare: 'Azzerare la posta?',
  azzerareTesto:
    'Il registro dimentica il permesso di spedire, la casella e il mittente, e l’invio diretto ' +
    'si spegne: le comunicazioni tornano a essere file .eml. Per ricollegarsi si rifà tutto il ' +
    'giro. L’autorizzazione data al programma si revoca dal profilo Microsoft.',
  postaAzzerata: 'Posta azzerata: le comunicazioni escono come file .eml.',
  aggiungi: 'Aggiungi account',
  aggiungiAiuto: 'Chiede l’indirizzo e apre l’accesso Microsoft nel browser',
  nessuno:
    'Nessun account ancora. Se usi il client di OneDrive, accedi lì e l’account compare qui; ' +
    'altrimenti aggiungine uno.',
  sulComputer: 'Sincronizzato su questo computer',
  onedriveCollegato: 'OneDrive collegato',
  onedriveDaCollegare: 'OneDrive da collegare',
  collega: 'Collega OneDrive',
  collegaAiuto:
    'Apre l’accesso Microsoft nel browser: il permesso della posta non vale per OneDrive',
  apriDaFile:
    'Un documento su OneDrive si apre dal menu File › Apri da OneDrive…, o con Ctrl+K.',
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
    titolo: 'Konten',
    aiuto:
      'Ein Microsoft-Konto kann zwei Dinge für das Klassenbuch, jedes mit seiner eigenen ' +
      'Berechtigung: die E-Mail — das Postfach, aus dem die Mitteilungen gehen — und OneDrive, ' +
      'wo das Klassenbuch .regi-Dokumente sucht und nur liest. Konten, die der OneDrive-Client ' +
      'auf diesem Computer synchronisiert, erscheinen von selbst und lassen sich ohne Anmeldung ' +
      'durchsuchen; die anderen verbindest du im Browser, wenn die Schule es erlaubt. Die ' +
      'Berechtigungen bleiben im Schlüsselbund des Systems.',
    posta: 'E-Mail',
    onedrive: 'OneDrive',
    nonLaCasella: 'nicht das Postfach des Klassenbuchs',
    azzera: 'Zurücksetzen',
    azzeraAiuto:
      'Entfernt Token, Postfach, Absender und Direktversand: die Verbindung wird neu eingerichtet',
    azzerare: 'E-Mail zurücksetzen?',
    azzerareTesto:
      'Das Klassenbuch vergisst die Berechtigung zum Senden, das Postfach und den Absender, und ' +
      'der Direktversand geht aus: Die Mitteilungen werden wieder .eml-Dateien. Zum neuen ' +
      'Verbinden macht man alles von vorn. Die dem Programm erteilte Berechtigung widerrufst du ' +
      'im Microsoft-Profil.',
    postaAzzerata: 'E-Mail zurückgesetzt: die Mitteilungen gehen als .eml-Dateien hinaus.',
    aggiungi: 'Konto hinzufügen',
    aggiungiAiuto: 'Fragt nach der Adresse und öffnet die Microsoft-Anmeldung im Browser',
    nessuno:
      'Noch kein Konto. Wenn du den OneDrive-Client nutzt, meldest du dich dort an und das ' +
      'Konto erscheint hier; sonst füge eines hinzu.',
    sulComputer: 'Auf diesem Computer synchronisiert',
    onedriveCollegato: 'OneDrive verbunden',
    onedriveDaCollegare: 'OneDrive nicht verbunden',
    collega: 'OneDrive verbinden',
    collegaAiuto:
      'Öffnet die Microsoft-Anmeldung im Browser: Die Berechtigung der E-Mail gilt nicht für ' +
      'OneDrive',
    apriDaFile:
      'Ein Dokument auf OneDrive öffnest du im Menü Datei › Aus OneDrive öffnen… oder mit Ctrl+K.',
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
    titolo: 'Comptes',
    aiuto:
      'Un compte Microsoft sait faire deux choses pour le registre, chacune avec son ' +
      'autorisation : la messagerie — la boîte d’où partent les communications — et OneDrive, où ' +
      'le registre cherche les documents .regi et ne fait que lire. Les comptes que le client ' +
      'OneDrive synchronise sur cet ordinateur apparaissent tout seuls et se parcourent sans ' +
      'connexion ; les autres se connectent dans le navigateur, si l’école le permet. Les ' +
      'autorisations restent dans le trousseau du système.',
    posta: 'Messagerie',
    onedrive: 'OneDrive',
    nonLaCasella: 'ce n’est pas la boîte du registre',
    azzera: 'Réinitialiser',
    azzeraAiuto:
      'Retire le jeton, la boîte, l’expéditeur et l’envoi direct : la connexion se refait de zéro',
    azzerare: 'Réinitialiser la messagerie ?',
    azzerareTesto:
      'Le registre oublie l’autorisation d’envoyer, la boîte et l’expéditeur, et l’envoi direct ' +
      's’éteint : les communications redeviennent des fichiers .eml. Pour se reconnecter, on ' +
      'refait tout le parcours. L’autorisation donnée au programme se révoque depuis le profil ' +
      'Microsoft.',
    postaAzzerata: 'Messagerie réinitialisée : les communications sortent en fichiers .eml.',
    aggiungi: 'Ajouter un compte',
    aggiungiAiuto: 'Demande l’adresse et ouvre la connexion Microsoft dans le navigateur',
    nessuno:
      'Aucun compte pour l’instant. Si tu utilises le client OneDrive, connecte-toi là et le ' +
      'compte apparaît ici ; sinon ajoutes-en un.',
    sulComputer: 'Synchronisé sur cet ordinateur',
    onedriveCollegato: 'OneDrive connecté',
    onedriveDaCollegare: 'OneDrive à connecter',
    collega: 'Connecter OneDrive',
    collegaAiuto:
      'Ouvre la connexion Microsoft dans le navigateur : l’autorisation des e-mails ne vaut ' +
      'pas pour OneDrive',
    apriDaFile:
      'Un document sur OneDrive s’ouvre depuis le menu Fichier › Ouvrir depuis OneDrive…, ou ' +
      'avec Ctrl+K.',
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
    titolo: 'Accounts',
    aiuto:
      'A Microsoft account can do two things for the register, each with its own permission: ' +
      'Mail — the mailbox the communications are sent from — and OneDrive, where the register ' +
      'looks for .regi documents and only reads. Accounts the OneDrive client syncs on this ' +
      'computer appear by themselves and can be browsed without signing in; the others are ' +
      'connected in the browser, if the school allows it. The permissions stay in the system ' +
      'keychain.',
    posta: 'Mail',
    onedrive: 'OneDrive',
    nonLaCasella: 'not the register’s mailbox',
    azzera: 'Reset',
    azzeraAiuto: 'Removes the token, mailbox, sender and direct sending: the connection starts over',
    azzerare: 'Reset mail?',
    azzerareTesto:
      'The register forgets the permission to send, the mailbox and the sender, and direct ' +
      'sending turns off: communications go back to being .eml files. To reconnect you go ' +
      'through the whole process again. The authorisation given to the program is revoked from ' +
      'the Microsoft profile.',
    postaAzzerata: 'Mail reset: communications go out as .eml files.',
    aggiungi: 'Add account',
    aggiungiAiuto: 'Asks for the address and opens the Microsoft sign-in in the browser',
    nessuno:
      'No account yet. If you use the OneDrive client, sign in there and the account appears ' +
      'here; otherwise add one.',
    sulComputer: 'Synced on this computer',
    onedriveCollegato: 'OneDrive connected',
    onedriveDaCollegare: 'OneDrive not connected',
    collega: 'Connect OneDrive',
    collegaAiuto:
      'Opens the Microsoft sign-in in the browser: the email permission does not cover OneDrive',
    apriDaFile: 'A document on OneDrive opens from the File menu › Open from OneDrive…, or with Ctrl+K.',
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

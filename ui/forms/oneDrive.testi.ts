// I testi della finestra che sfoglia OneDrive (`oneDrive.tsx`).

import { catalogo, perNumero } from '#core/i18n/index.js'

const it = {
  titolo: 'Apri da OneDrive',
  aiuto:
    'Le cartelle di OneDrive e i documenti del registro che contengono. Un documento ' +
    'sincronizzato sul computer si apre da lì; uno che non lo è si scarica prima in una ' +
    'cartella a scelta, e quella copia non torna su OneDrive.',
  account: 'Account',
  comeAccount: (indirizzo: string) => `Come ${indirizzo}`,
  leggo: 'Leggo la cartella…',
  cerco: 'Cerco i documenti del registro…',
  nonSiLegge: 'OneDrive non ha risposto.',
  radice: 'Radice',
  su: 'Su',
  cercaTutti: 'Trova tutti i .regi',
  cercaTuttiAiuto: 'In tutte le cartelle di OneDrive dell’account, dal più recente',
  dalComputer: 'Cercati nelle cartelle che OneDrive sincronizza su questo computer.',
  risultati: 'Documenti del registro trovati',
  trovati: (n: number) => `${n} ${perNumero(n, 'documento trovato', 'documenti trovati')}.`,
  troppi: 'Sono troppi per mostrarli tutti.',
  tempoScaduto: 'La ricerca durava troppo e si è fermata: ne mostro una parte.',
  indiceMicrosoft:
    'La ricerca usa l’indice di Microsoft: un file appena caricato può mancare, e lo si trova ' +
    'sfogliando le cartelle.',
  altriFile: (n: number) =>
    `${n} ${perNumero(n, 'altro file non è', 'altri file non sono')} del registro e non si ` +
    `${perNumero(n, 'mostra', 'mostrano')}.`,
  cartellaVuota: 'In questa cartella non ci sono sottocartelle né documenti del registro.',
  nessunoTrovato: 'Microsoft non ha trovato documenti del registro per questo account.',
  elementi: (n: number) => `${n} ${perNumero(n, 'elemento', 'elementi')}`,
  apriAiuto: 'Apre la copia sincronizzata sul computer, o ne scarica una',
  nessunAccount:
    'Nessun account con OneDrive. Se usi il client di OneDrive, accedi lì e l’account ' +
    'compare da solo; altrimenti collegane uno nel browser, come la posta.',
  collega: 'Collega un account',
  impostazioni: 'Account',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Aus OneDrive öffnen',
    aiuto:
      'Die Ordner in OneDrive und die Dokumente des Klassenbuchs darin. Ein auf dem Computer ' +
      'synchronisiertes Dokument wird von dort geöffnet; eines, das es nicht ist, wird zuerst ' +
      'in einen Ordner deiner Wahl heruntergeladen, und diese Kopie geht nicht zurück auf OneDrive.',
    account: 'Konto',
    comeAccount: (indirizzo) => `Als ${indirizzo}`,
    leggo: 'Ordner wird gelesen…',
    cerco: 'Dokumente des Klassenbuchs werden gesucht…',
    nonSiLegge: 'OneDrive hat nicht geantwortet.',
    radice: 'Stamm',
    su: 'Hoch',
    cercaTutti: 'Alle .regi finden',
    cercaTuttiAiuto: 'In allen OneDrive-Ordnern des Kontos, die neusten zuerst',
    dalComputer: 'Gesucht in den Ordnern, die OneDrive auf diesem Computer synchronisiert.',
    risultati: 'Gefundene Dokumente des Klassenbuchs',
    trovati: (n) => `${n} ${perNumero(n, 'Dokument gefunden', 'Dokumente gefunden')}.`,
    troppi: 'Es sind zu viele, um alle anzuzeigen.',
    tempoScaduto: 'Die Suche dauerte zu lange und wurde angehalten: Hier ist ein Teil davon.',
    indiceMicrosoft:
      'Die Suche nutzt den Index von Microsoft: Eine eben hochgeladene Datei kann fehlen, und ' +
      'man findet sie beim Durchsuchen der Ordner.',
    altriFile: (n) =>
      `${n} ${perNumero(n, 'andere Datei ist kein Dokument', 'andere Dateien sind keine Dokumente')} ` +
      `des Klassenbuchs und ${perNumero(n, 'wird', 'werden')} nicht angezeigt.`,
    cartellaVuota: 'In diesem Ordner gibt es weder Unterordner noch Dokumente des Klassenbuchs.',
    nessunoTrovato: 'Microsoft hat für dieses Konto keine Dokumente des Klassenbuchs gefunden.',
    elementi: (n) => `${n} ${perNumero(n, 'Element', 'Elemente')}`,
    apriAiuto: 'Öffnet die auf dem Computer synchronisierte Kopie oder lädt eine herunter',
    nessunAccount:
      'Kein Konto mit OneDrive. Wenn du den OneDrive-Client nutzt, meldest du dich dort an und ' +
      'das Konto erscheint von selbst; sonst verbinde eines im Browser, wie die E-Mail.',
    collega: 'Konto verbinden',
    impostazioni: 'Konten',
  },
  fr: {
    titolo: 'Ouvrir depuis OneDrive',
    aiuto:
      'Les dossiers de OneDrive et les documents du registre qu’ils contiennent. Un document ' +
      'synchronisé sur l’ordinateur s’ouvre depuis là ; un document qui ne l’est pas se ' +
      'télécharge d’abord dans un dossier au choix, et cette copie ne retourne pas sur OneDrive.',
    account: 'Compte',
    comeAccount: (indirizzo) => `En tant que ${indirizzo}`,
    leggo: 'Lecture du dossier…',
    cerco: 'Recherche des documents du registre…',
    nonSiLegge: 'OneDrive n’a pas répondu.',
    radice: 'Racine',
    su: 'Monter',
    cercaTutti: 'Trouver tous les .regi',
    cercaTuttiAiuto: 'Dans tous les dossiers OneDrive du compte, du plus récent au plus ancien',
    dalComputer: 'Cherchés dans les dossiers que OneDrive synchronise sur cet ordinateur.',
    risultati: 'Documents du registre trouvés',
    trovati: (n) => `${n} ${perNumero(n, 'document trouvé', 'documents trouvés')}.`,
    troppi: 'Il y en a trop pour tous les montrer.',
    tempoScaduto: 'La recherche prenait trop de temps et s’est arrêtée : en voici une partie.',
    indiceMicrosoft:
      'La recherche utilise l’index de Microsoft : un fichier qui vient d’être déposé peut ' +
      'manquer, et on le trouve en parcourant les dossiers.',
    altriFile: (n) =>
      `${n} ${perNumero(n, 'autre fichier n’est', 'autres fichiers ne sont')} pas du registre et ` +
      `${perNumero(n, 'n’est', 'ne sont')} pas ${perNumero(n, 'montré', 'montrés')}.`,
    cartellaVuota: 'Ce dossier ne contient ni sous-dossiers ni documents du registre.',
    nessunoTrovato: 'Microsoft n’a trouvé aucun document du registre pour ce compte.',
    elementi: (n) => `${n} ${perNumero(n, 'élément', 'éléments')}`,
    apriAiuto: 'Ouvre la copie synchronisée sur l’ordinateur, ou en télécharge une',
    nessunAccount:
      'Aucun compte avec OneDrive. Si tu utilises le client OneDrive, connecte-toi là et le ' +
      'compte apparaît tout seul ; sinon connectes-en un dans le navigateur, comme les e-mails.',
    collega: 'Connecter un compte',
    impostazioni: 'Comptes',
  },
  en: {
    titolo: 'Open from OneDrive',
    aiuto:
      'The OneDrive folders and the register documents they hold. A document synced on the ' +
      'computer opens from there; one that is not is first downloaded to a folder of your ' +
      'choice, and that copy does not go back to OneDrive.',
    account: 'Account',
    comeAccount: (indirizzo) => `As ${indirizzo}`,
    leggo: 'Reading the folder…',
    cerco: 'Looking for register documents…',
    nonSiLegge: 'OneDrive did not answer.',
    radice: 'Root',
    su: 'Up',
    cercaTutti: 'Find all .regi',
    cercaTuttiAiuto: 'In all the account’s OneDrive folders, most recent first',
    dalComputer: 'Looked for in the folders OneDrive syncs on this computer.',
    risultati: 'Register documents found',
    trovati: (n) => `${n} ${perNumero(n, 'document found', 'documents found')}.`,
    troppi: 'There are too many to show them all.',
    tempoScaduto: 'The search was taking too long and stopped: here are some of them.',
    indiceMicrosoft:
      'The search uses Microsoft’s index: a file just uploaded may be missing, and you find it ' +
      'by browsing the folders.',
    altriFile: (n) =>
      `${n} other ${perNumero(n, 'file is', 'files are')} not register documents and ` +
      `${perNumero(n, 'is', 'are')} not shown.`,
    cartellaVuota: 'This folder has no subfolders and no register documents.',
    nessunoTrovato: 'Microsoft found no register documents for this account.',
    elementi: (n) => `${n} ${perNumero(n, 'item', 'items')}`,
    apriAiuto: 'Opens the copy synced on the computer, or downloads one',
    nessunAccount:
      'No account with OneDrive. If you use the OneDrive client, sign in there and the account ' +
      'appears by itself; otherwise connect one in the browser, as for email.',
    collega: 'Connect an account',
    impostazioni: 'Accounts',
  },
})
